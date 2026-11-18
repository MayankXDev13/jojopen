/* Semantic role inference — mirrors the production app's keyword table. */

const ROLE_WORDS: [string, string[]][] = [
  ['security', ['auth', 'login', 'token', 'key', 'shield', 'vault', 'certificate', 'fingerprint', 'identity', 'password', 'oauth', 'sso', 'jwt', 'permission', 'waf', 'secret']],
  ['cache', ['cache', 'redis', 'memcached', 'cdn edge', 'fast storage', 'session store']],
  ['messaging', ['queue', 'kafka', 'sqs', 'sns', 'kinesis', 'stream', 'pub/sub', 'pubsub', 'event bus', 'event', 'topic', 'inbox', 'notification', 'sms', 'webhook', 'mail', 'email', 'chat', 'websocket', 'sse', 'peer to peer', 'p2p']],
  ['data', ['db', 'database', 'postgres', 'mysql', 'mongo', 'dynamo', 'aurora', 'rds', 'sql', 'warehouse', 'lake', 'bucket', 'table', 'document db', 'kv', 'key-value', 'index', 'graph db', 'time series', 'vector db', 'archive', 'memory', 'disk', 'backup', 'file', 'folder', 'storage', 'search index']],
  ['network', ['cdn', 'api gateway', 'gateway', 'dns', 'load balancer', 'balancer', 'proxy', 'router', 'firewall', 'vpn', 'wifi', 'wi-fi', 'switch', 'antenna', 'network', 'globe', 'edge', 'cloudfront', 'route 53', 'internet', 'browser']],
  ['compute', ['service', 'server', 'worker', 'container', 'cluster', 'function', 'lambda', 'cron', 'cpu', 'gpu', 'vm', 'microservice', 'pod', 'node', 'app', 'application', 'backend', 'frontend', 'api', 'build', 'deploy', 'ci', 'pipeline', 'terminal', 'code', 'test', 'logs', 'metrics']],
  ['actor', ['user', 'users', 'customer', 'client', 'admin', 'person', 'actor', 'mobile', 'desktop', 'laptop', 'tablet', 'bot', 'support', 'shopper', 'visitor', 'member', 'team', 'developer']],
  ['external', ['external', 'third party', 'third-party', 'stripe', 'twilio', 'sendgrid', 'provider', 'saas', 'partner', 'vendor', 'payment provider']],
];

export const ICON_ROLE: Record<string, string> = {
  user: 'actor', users: 'actor', person: 'actor', mobile: 'actor', browser: 'network', bot: 'actor',
  cloud: 'compute', cdn: 'network', globe: 'network', gateway: 'network', 'load-balancer': 'network', dns: 'network', router: 'network', firewall: 'security', proxy: 'network', wifi: 'network', vpn: 'security', switch: 'network', antenna: 'network',
  server: 'compute', 'server-rack': 'compute', container: 'compute', cluster: 'compute', function: 'compute', worker: 'compute', cron: 'compute', cpu: 'compute', gpu: 'compute', vm: 'compute', microservice: 'compute', api: 'compute', webhook: 'network',
  database: 'data', 'database-cluster': 'data', table: 'data', 'document-db': 'data', 'key-value': 'data', warehouse: 'data', lake: 'data', bucket: 'data', file: 'data', folder: 'data', disk: 'data', backup: 'data', search: 'data', graph: 'data', 'time-series': 'data', vector: 'data', archive: 'data', memory: 'data', storage: 'data',
  queue: 'messaging', stream: 'messaging', pubsub: 'messaging', 'event-bus': 'messaging', topic: 'messaging', inbox: 'messaging', mail: 'messaging', notification: 'messaging', chat: 'messaging', sms: 'messaging', websocket: 'messaging', send: 'messaging',
  cache: 'cache', redis: 'cache',
  key: 'security', shield: 'security', verified: 'security', token: 'security', certificate: 'security', fingerprint: 'security', eye: 'security', vault: 'security', login: 'security', identity: 'security',
  card: 'external', invoice: 'external', cart: 'external', shop: 'external', wallet: 'external',
  analytics: 'compute', dashboard: 'compute', report: 'compute', llm: 'compute', robot: 'compute', integration: 'network', thirdparty: 'external',
  git: 'compute', commit: 'compute', pr: 'compute', ci: 'compute', build: 'compute', deploy: 'compute', terminal: 'compute', code: 'compute', bug: 'compute', test: 'compute', logs: 'compute', metrics: 'compute', monitoring: 'compute', alert: 'security', settings: 'neutral', flag: 'neutral', config: 'neutral', package: 'compute', registry: 'compute',
  check: 'neutral', warning: 'security', info: 'neutral', question: 'neutral', star: 'neutral', heart: 'neutral', home: 'actor', location: 'network', calendar: 'neutral', clock: 'neutral', timer: 'neutral', hourglass: 'neutral', lightning: 'compute', fire: 'security', ice: 'data', idea: 'neutral', note: 'neutral', pencil: 'neutral', trash: 'neutral', filter: 'neutral', sort: 'neutral', layers: 'data', grid: 'neutral', puzzle: 'neutral', target: 'neutral', trophy: 'neutral', plus: 'neutral', swap: 'network', power: 'compute', tag: 'neutral',
};

export function inferRole(label: string, icon?: string | null, shape?: string): string {
  const s = (label || '').toLowerCase();
  const ic = (icon || '').toLowerCase();
  if (ic) {
    const iconRole = ICON_ROLE[ic];
    if (iconRole) return iconRole;
  }
  if (shape === 'person') return 'actor';
  if (shape === 'cylinder') return 'data';
  for (const [role, words] of ROLE_WORDS) {
    for (const w of words) {
      if (s === w || s.startsWith(w + ' ') || s.endsWith(' ' + w) || s.includes(' ' + w + ' ')) return role;
    }
  }
  return 'neutral';
}
