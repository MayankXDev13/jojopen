/* Starter content, slide geometry and shared UI constants. */

import { SLIDE_H, SLIDE_W } from './model';

export type ToolDef = { tool: string; icon: string; label: string };
export const TOOLBAR: (ToolDef | 'sep')[] = [
  { tool: 'select', icon: 'select', label: 'Select' },
  { tool: 'hand', icon: 'hand', label: 'Hand' },
  'sep',
  { tool: 'rectangle', icon: 'rectangle', label: 'Rectangle' },
  { tool: 'ellipse', icon: 'ellipse', label: 'Ellipse' },
  { tool: 'diamond', icon: 'diamond', label: 'Diamond' },
  { tool: 'cylinder', icon: 'cylinder', label: 'Cylinder' },
  { tool: 'arrow', icon: 'arrow', label: 'Arrow' },
  { tool: 'line', icon: 'line', label: 'Line' },
  'sep',
  { tool: 'text', icon: 'text', label: 'Text' },
  { tool: 'pen', icon: 'pen', label: 'Pen' },
  { tool: 'sticky', icon: 'sticky', label: 'Sticky note' },
  { tool: 'image', icon: 'image', label: 'Image' },
  'sep',
  { tool: 'frame', icon: 'frame', label: 'Diagram frame' },
  { tool: 'eraser', icon: 'eraser', label: 'Eraser' },
  { tool: 'laser', icon: 'laser', label: 'Laser pointer' },
];

export const TEMPLATES: Record<string, string> = {
  system: `title: URL shortener
direction: right
User [icon: stick-figure]
group Edge {
  CDN [icon: cdn]
  Load Balancer [icon: load-balancer]
}
group Services {
  Shorten API [icon: server]
  Redirect API [icon: server]
}
group Data {
  Redis [icon: redis, cylinder]
  URL DB [icon: postgresql, cylinder]
}
User -> CDN: GET /abc → 301
User -> Load Balancer: POST /shorten
CDN -> Load Balancer: miss
Load Balancer -> Shorten API: write
Load Balancer -> Redirect API: read
Shorten API -> URL DB: save
Redirect API -> Redis: lookup
Redirect API --> URL DB: on miss`,
  flow: `title: Sign-up flow
direction: down
Start [ellipse]
Enter email [rounded]
Valid email? [diamond]
Send code [rounded]
Show error [rounded]
Account ready [ellipse]
Start -> Enter email
Enter email -> Valid email?
Valid email? -> Send code: yes
Valid email? -> Show error: no
Show error -> Enter email: retry
Send code -> Account ready`,
  slideDiagram: `direction: right
Client [icon: stick-figure]
API [icon: server]
Cache [icon: redis, cylinder]
DB [icon: postgresql, cylinder]
Client -> API: request
API -> Cache: lookup
API --> DB: on miss`,
  demo: `title: Checkout flow
direction: right

User [icon: user]
Web [icon: browser]
API [icon: server]
group Services {
  Orders [icon: server]
  Payments [icon: lock]
}
Postgres [cylinder]
Redis [cylinder]
Kafka
Stripe [icon: card]

User -> Web
Web -> API: POST /checkout
API -> Orders
API -> Payments
Orders -> Postgres: write
Orders -> Redis: cache
Payments -> Stripe: charge
Orders --> Kafka: order.created`,
};

export const AI_SUGGESTIONS = [
  'Draw the architecture of a URL shortener',
  'Flowchart of a password reset flow',
  'Review this diagram for a 10k RPS launch',
  'Explain the read path',
];

export const Z1 = (n: number) => Math.round((n * SLIDE_W) / 1920);

export type SlideTextSpec = { text: string; x: number; y: number; w: number; size: number; align: string; role: string };
export type SlideGeometry = { texts: SlideTextSpec[]; diagramArea: { x: number; y: number; w: number; h: number } | null };

export function slideGeometry(layout: string): SlideGeometry {
  const u = Z1(120);
  const W = SLIDE_W;
  const H = SLIDE_H;
  const out: SlideGeometry = { texts: [], diagramArea: null };
  const add = (text: string, x: number, y: number, w: number, size: number, align: string, role: string) =>
    out.texts.push({ text, x, y, w, size, align, role });
  if (layout === 'title') {
    add('Presentation title', u, Z1(380), W - 2 * u, Z1(104), 'center', 'title');
    add('Subtitle or presenter name', u, Z1(560), W - 2 * u, Z1(44), 'center', 'subtitle');
  } else if (layout === 'section') {
    add('Section title', Z1(160), Z1(420), W - Z1(320), Z1(96), 'left', 'title');
    add('What this part covers', Z1(164), Z1(580), W - Z1(320), Z1(40), 'left', 'subtitle');
  } else if (layout === 'bullets') {
    add('Slide title', u, Z1(96), W - 2 * u, Z1(72), 'left', 'title');
    add('•  First point\n•  Second point\n•  Third point', u + 8, Z1(280), W - 2 * u - 8, Z1(44), 'left', 'bullets');
  } else if (layout === 'diagram') {
    add('How it works', u, Z1(80), W - 2 * u, Z1(64), 'left', 'title');
    out.diagramArea = { x: u, y: Z1(220), w: W - 2 * u, h: H - Z1(220) - Z1(80) };
  } else if (layout === 'diagram-bullets') {
    add('How it works', u, Z1(80), W - 2 * u, Z1(64), 'left', 'title');
    add('•  Requests hit the API\n•  Reads come from the cache', u + 8, Z1(260), Z1(600), Z1(36), 'left', 'bullets');
    out.diagramArea = { x: Z1(800), y: Z1(220), w: W - Z1(800) - u, h: H - Z1(220) - Z1(80) };
  }
  return out;
}

export function estimateTextHeight(text: string, width: number, size: number): number {
  const lines = text
    .split('\n')
    .reduce((s, ln) => s + Math.max(1, Math.ceil((ln.length * size * 0.56) / Math.max(1, width))), 0);
  return Math.max(size * 1.3, lines * size * 1.28);
}

export const SLIDE_TITLES: Record<string, string> = {
  title: 'Presentation title',
  section: 'Section title',
  bullets: 'Slide title',
  diagram: 'How it works',
  'diagram-bullets': 'How it works',
  blank: 'Untitled slide',
};
