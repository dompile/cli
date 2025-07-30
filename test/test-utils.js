/**
 * Test utilities for Bun-native operations
 */

/**
 * Run CLI command by directly importing and executing the CLI module
 * @param {Array<string>} args - Command arguments
 * @param {Object} options - Spawn options
 * @returns {Promise<Object>} Result with code, stdout, stderr
 */
export async function runCLI(args, options = {}) {
  // Create a subprocess for isolation
  const cliPath = new URL('../../bin/cli.js', import.meta.url).pathname;
  
  const proc = Bun.spawn(['/home/founder3/.bun/bin/bun', cliPath, ...args], {
    cwd: options.cwd || import.meta.dir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...Bun.env, ...options.env },
    ...options
  });
  
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  
  return { code, stdout, stderr };
}

/**
 * Run any command using Bun.spawn
 * @param {string} command - Command to run
 * @param {Array<string>} args - Command arguments
 * @param {Object} options - Spawn options
 * @returns {Promise<Object>} Result with code, stdout, stderr
 */
export async function runCommand(command, args = [], options = {}) {
  const proc = Bun.spawn([command, ...args], {
    cwd: options.cwd || process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
    env: options.env || {},
    ...options
  });
  
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  
  return { code, stdout, stderr };
}