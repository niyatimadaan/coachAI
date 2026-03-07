// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    Version: 29,
    select: jest.fn((obj) => obj.android),
  },
  NativeModules: {},
  NativeEventEmitter: jest.fn(),
}));

// Mock react-native-sqlite-storage with in-memory storage
jest.mock('react-native-sqlite-storage', () => {
  // In-memory storage for testing
  const storage = {
    tables: new Map(),
    autoIncrementCounters: new Map(),
  };
  
  const mockDB = {
    transaction: jest.fn(async (callback) => {
      const tx = {
        executeSql: jest.fn(async (sql, params = []) => {
          return mockDB.executeSql(sql, params);
        }),
      };
      await callback(tx);
    }),
    executeSql: jest.fn(async (sql, params = []) => {
      const sqlLower = sql.toLowerCase().trim();
      
      // CREATE TABLE
      if (sqlLower.startsWith('create table')) {
        const match = sql.match(/create table (?:if not exists )?(\w+)/i);
        if (match) {
          const tableName = match[1];
          if (!storage.tables.has(tableName)) {
            storage.tables.set(tableName, []);
            storage.autoIncrementCounters.set(tableName, 1);
          }
        }
        return [{ rows: { length: 0, item: () => null } }];
      }
      
      // CREATE INDEX
      if (sqlLower.startsWith('create index')) {
        return [{ rows: { length: 0, item: () => null } }];
      }
      
      // INSERT
      if (sqlLower.startsWith('insert')) {
        const match = sql.match(/insert into (\w+)/i);
        if (match) {
          const tableName = match[1];
          const table = storage.tables.get(tableName) || [];
          
          // Extract column names
          const colMatch = sql.match(/\(([^)]+)\)\s*values/i);
          if (colMatch) {
            const columns = colMatch[1].split(',').map(c => c.trim());
            const row = {};
            
            // Map params to columns
            columns.forEach((col, idx) => {
              row[col] = params[idx];
            });
            
            // Add auto-increment ID if not provided
            if (!row.id) {
              const counter = storage.autoIncrementCounters.get(tableName) || 1;
              row.id = counter;
              storage.autoIncrementCounters.set(tableName, counter + 1);
            }
            
            table.push(row);
            storage.tables.set(tableName, table);
            
            return [{ rows: { length: 0, item: () => null }, insertId: row.id }];
          }
        }
        return [{ rows: { length: 0, item: () => null }, insertId: 1 }];
      }
      
      // UPDATE
      if (sqlLower.startsWith('update')) {
        const match = sql.match(/update (\w+) set .+ where (.+)/i);
        if (match) {
          const tableName = match[1];
          const table = storage.tables.get(tableName) || [];
          
          // Simple WHERE clause parsing (supports "column = ?" only)
          const whereMatch = match[2].match(/(\w+)\s*=\s*\?/);
          if (whereMatch) {
            const whereCol = whereMatch[1];
            const whereVal = params[params.length - 1];
            
            // Find and update matching rows
            let rowsAffected = 0;
            table.forEach(row => {
              if (row[whereCol] === whereVal) {
                // Update columns (simplified - assumes SET col1=?, col2=? format)
                const setMatch = sql.match(/set (.+) where/i);
                if (setMatch) {
                  const setPairs = setMatch[1].split(',');
                  setPairs.forEach((pair, idx) => {
                    const colMatch = pair.match(/(\w+)\s*=/);
                    if (colMatch && idx < params.length - 1) {
                      row[colMatch[1]] = params[idx];
                    }
                  });
                }
                rowsAffected++;
              }
            });
            
            return [{ rows: { length: 0, item: () => null }, rowsAffected }];
          }
        }
        return [{ rows: { length: 0, item: () => null }, rowsAffected: 0 }];
      }
      
      // DELETE
      if (sqlLower.startsWith('delete')) {
        const match = sql.match(/delete from (\w+)(?: where (.+))?/is);
        if (match) {
          const tableName = match[1];
          const table = storage.tables.get(tableName) || [];
          
          if (!match[2]) {
            // DELETE all rows
            const count = table.length;
            storage.tables.set(tableName, []);
            return [{ rows: { length: 0, item: () => null }, rowsAffected: count }];
          }
          
          // DELETE with WHERE clause
          const whereClause = match[2].trim();
          
          // Handle subquery: id IN (SELECT ...)
          if (whereClause.toLowerCase().includes('in (')) {
            const subqueryMatch = whereClause.match(/(\w+)\s+in\s+\(\s*select\s+(\w+)\s+from\s+(\w+)\s+where\s+(.+?)\s+order by\s+(\w+)\s+(asc|desc)\s+limit\s+(-?\d+)(?:\s+offset\s+(\d+))?\s*\)/is);
            if (subqueryMatch) {
              const [, idCol, selectCol, subTable, subWhere, orderCol, orderDir, limit, offset] = subqueryMatch;
              
              // Execute subquery
              let subTableData = storage.tables.get(subTable) || [];
              
              // Apply WHERE clause of subquery
              const subWhereMatch = subWhere.match(/(\w+)\s*=\s*\?/);
              if (subWhereMatch) {
                const subWhereCol = subWhereMatch[1];
                const subWhereVal = params[0];
                subTableData = subTableData.filter(row => row[subWhereCol] === subWhereVal);
              }
              
              // Apply ORDER BY
              subTableData = [...subTableData].sort((a, b) => {
                const aVal = a[orderCol];
                const bVal = b[orderCol];
                if (orderDir.toLowerCase() === 'desc') {
                  return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
                }
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
              });
              
              // Apply LIMIT and OFFSET
              const limitNum = parseInt(limit);
              const offsetNum = offset ? parseInt(offset) : 0;
              
              if (limitNum === -1) {
                // LIMIT -1 OFFSET n means "skip first n rows, take all remaining"
                subTableData = subTableData.slice(offsetNum);
              } else {
                subTableData = subTableData.slice(offsetNum, offsetNum + limitNum);
              }
              
              // Get IDs to delete
              const idsToDelete = new Set(subTableData.map(row => row[selectCol]));
              
              // Filter out rows with matching IDs
              const filtered = table.filter(row => !idsToDelete.has(row[idCol]));
              const rowsAffected = table.length - filtered.length;
              storage.tables.set(tableName, filtered);
              
              return [{ rows: { length: 0, item: () => null }, rowsAffected }];
            }
          }
          
          // Simple WHERE clause
          const eqMatch = whereClause.match(/(\w+)\s*=\s*\?/);
          if (eqMatch) {
            const whereCol = eqMatch[1];
            const whereVal = params[0];
            const filtered = table.filter(row => row[whereCol] !== whereVal);
            const rowsAffected = table.length - filtered.length;
            storage.tables.set(tableName, filtered);
            return [{ rows: { length: 0, item: () => null }, rowsAffected }];
          }
        }
        return [{ rows: { length: 0, item: () => null }, rowsAffected: 0 }];
      }
      
      // SELECT
      if (sqlLower.startsWith('select')) {
        const match = sql.match(/from (\w+)(?: where (.+?))?(?:\s+order by .+)?(?:\s+limit .+)?$/is);
        if (match) {
          const tableName = match[1];
          let table = storage.tables.get(tableName) || [];
          
          // Apply WHERE clause if present
          if (match[2]) {
            const whereClause = match[2].trim();
            
            // Handle complex WHERE with multiple conditions
            if (whereClause.toLowerCase().includes(' and ')) {
              // Split by AND and process each condition
              const conditions = whereClause.split(/\s+and\s+/i);
              let paramIndex = 0;
              
              for (const condition of conditions) {
                const trimmedCond = condition.trim();
                
                // Check operators in order of specificity (>= before >, <= before <)
                if (trimmedCond.includes('>=')) {
                  const match = trimmedCond.match(/(\w+)\s*>=\s*\?/);
                  if (match) {
                    const col = match[1];
                    const val = params[paramIndex++];
                    table = table.filter(row => Number(row[col]) >= Number(val));
                  }
                } else if (trimmedCond.includes('<=')) {
                  const match = trimmedCond.match(/(\w+)\s*<=\s*\?/);
                  if (match) {
                    const col = match[1];
                    const val = params[paramIndex++];
                    table = table.filter(row => Number(row[col]) <= Number(val));
                  }
                } else if (trimmedCond.includes('<')) {
                  const match = trimmedCond.match(/(\w+)\s*<\s*\?/);
                  if (match) {
                    const col = match[1];
                    const val = params[paramIndex++];
                    table = table.filter(row => Number(row[col]) < Number(val));
                  }
                } else if (trimmedCond.includes('>')) {
                  const match = trimmedCond.match(/(\w+)\s*>\s*\?/);
                  if (match) {
                    const col = match[1];
                    const val = params[paramIndex++];
                    table = table.filter(row => Number(row[col]) > Number(val));
                  }
                } else if (trimmedCond.includes('=')) {
                  const match = trimmedCond.match(/(\w+)\s*=\s*\?/);
                  if (match) {
                    const col = match[1];
                    const val = params[paramIndex++];
                    table = table.filter(row => row[col] === val);
                  }
                }
              }
            } else {
              // Simple single condition
              const eqMatch = whereClause.match(/(\w+)\s*=\s*\?/);
              if (eqMatch) {
                const whereCol = eqMatch[1];
                const whereVal = params[0];
                table = table.filter(row => row[whereCol] === whereVal);
              }
            }
          }
          
          // Apply ORDER BY
          if (sqlLower.includes('order by')) {
            const orderMatch = sql.match(/order by (\w+)(?:\s+(asc|desc))?/i);
            if (orderMatch) {
              const orderCol = orderMatch[1];
              const orderDir = (orderMatch[2] || 'asc').toLowerCase();
              table = [...table].sort((a, b) => {
                const aVal = a[orderCol];
                const bVal = b[orderCol];
                if (orderDir === 'desc') {
                  return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
                }
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
              });
            }
          }
          
          // Apply LIMIT
          if (sqlLower.includes('limit')) {
            const limitMatch = sql.match(/limit (\?|\d+)(?:\s+offset\s+(\?|\d+))?/i);
            if (limitMatch) {
              const limit = limitMatch[1] === '?' ? params[params.length - 1] : parseInt(limitMatch[1]);
              const offset = limitMatch[2] ? (limitMatch[2] === '?' ? params[params.length - 2] : parseInt(limitMatch[2])) : 0;
              
              // Handle LIMIT -1 OFFSET n (SQLite idiom for "skip first n rows")
              if (limit === -1) {
                table = table.slice(offset);
              } else {
                table = table.slice(offset, offset + limit);
              }
            }
          }
          
          return [{
            rows: {
              length: table.length,
              item: (idx) => table[idx],
            },
          }];
        }
        return [{ rows: { length: 0, item: () => null } }];
      }
      
      return [{ rows: { length: 0, item: () => null } }];
    }),
    close: jest.fn(async () => {
      // Clear storage on close
      storage.tables.clear();
      storage.autoIncrementCounters.clear();
    }),
  };
  
  return {
    default: {
      enablePromise: jest.fn(),
      openDatabase: jest.fn(() => Promise.resolve(mockDB)),
    },
    enablePromise: jest.fn(),
    openDatabase: jest.fn(() => Promise.resolve(mockDB)),
  };
});

// Mock react-native-vision-camera
jest.mock('react-native-vision-camera', () => ({
  Camera: {
    getCameraDevice: jest.fn(),
    requestCameraPermission: jest.fn(() => Promise.resolve('granted')),
  },
}));

// Mock react-native-fs
jest.mock('react-native-fs', () => ({
  unlink: jest.fn(() => Promise.resolve()),
  exists: jest.fn(() => Promise.resolve(true)),
  mkdir: jest.fn(() => Promise.resolve()),
}));

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
