const path = require("path");
const {
  getStorageInfo,
  checkIntegrity,
  createBackup,
  restoreBackup
} = require("../backend/storage");

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

function usage() {
  console.log(`Usage:
  npm run data:doctor
  npm run data:backup -- [label]
  npm run data:restore -- <backup-file>

Environment:
  DATA_DIR=backend/data`);
}

function main() {
  const [, , command, ...args] = process.argv;

  if (command === "doctor") {
    const result = checkIntegrity();
    printJson(result);
    if (!result.ok) process.exit(1);
    return;
  }

  if (command === "backup") {
    printJson(createBackup({ label: args[0] || "" }));
    return;
  }

  if (command === "restore") {
    if (!args[0]) {
      usage();
      process.exit(1);
    }
    printJson(restoreBackup(path.resolve(args[0])));
    return;
  }

  if (command === "info") {
    printJson(getStorageInfo());
    return;
  }

  usage();
  process.exit(1);
}

main();
