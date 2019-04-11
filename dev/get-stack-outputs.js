let { execSync } = require('child_process');

//
// Shells out to `sls info --verbose` and parses the output to build a hash of
// stack outputs.
//
function getStackOutputs(stageName) {
  let cmd = 'sls info --verbose';
  if (stageName) {
    cmd = `${cmd} --stage ${stageName}`;
  }

  let output = execSync(cmd).toString();
  let lines = output.split('\n');

  let headerIndex = lines.indexOf('Stack Outputs');
  if (headerIndex === -1) {
    throw new Error('No stack outputs found');
  }

  let outputs = {};
  const re = /^(\w+): (.+)$/;
  lines.slice(headerIndex).forEach((line) => {
    let match = re.exec(line);
    if (match) {
      outputs[match[1]] = match[2];
    }
  });

  return outputs;
}

module.exports = getStackOutputs;
