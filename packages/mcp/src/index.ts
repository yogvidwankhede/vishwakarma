/**
 * @vishwakarma/mcp
 *
 * The Model Context Protocol server. Run it with `npx @vishwakarma/mcp`, or register it
 * in an MCP client config with `vishwakarma add --target mcp`.
 *
 * The executable entry point is `./server.js`; this module exists so the package can also
 * be imported programmatically by a host that wants to mount the server itself.
 */

export const SERVER_NAME = 'vishwakarma'
export const SERVER_VERSION = '0.1.0'

/** The client configuration needed to register this server. */
export const clientConfig = {
  command: 'npx',
  args: ['-y', '@vishwakarma/mcp'],
} as const
