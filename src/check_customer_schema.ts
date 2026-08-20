import * as fs from 'fs';
import * as path from 'path';

const rootDir = 'E:\\Pijush Patra\\Puja Software';
const awsSqlPath = path.join(rootDir, 'sksstdatabase_aws.sql');

function getTableStructure(filePath: string, tableName: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let capturing = false;
  let result: string[] = [];
  
  for (const line of lines) {
    if (line.toLowerCase().includes(`create table \`${tableName}\``) || line.toLowerCase().includes(`create table ${tableName}`)) {
      capturing = true;
      result.push(line);
      continue;
    }
    if (capturing) {
      result.push(line);
      if (line.trim().startsWith(')') && (line.includes('ENGINE') || line.includes(';'))) {
        break;
      }
    }
  }
  return result.join('\n');
}

console.log('=== canteen_customers ===');
console.log(getTableStructure(awsSqlPath, 'canteen_customers'));
