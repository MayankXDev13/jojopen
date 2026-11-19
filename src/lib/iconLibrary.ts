/* Imported icon library from jojopen.com (live bundle).
   164 sketch icons (paths + dot circles, 24x24 stroke) +
   279 brand icons (simple-icons fill paths, 24x24). Old hand-made
   ICONS palette removed from search — this is the only / source. */

export type IconDef = {
  id: string;
  name: string;
  category: string;
  role: string;
  keywords: string[];
  paths: string[];
  circles?: { cx: number; cy: number; r: number }[];
  brand?: { hex: string };
};

export const STARTER_ICONS: IconDef[] = [
  {
    id: "stick-figure",
    name: "Stick figure",
    category: "people",
    role: "actor",
    keywords: [
      "person",
      "user",
      "human",
      "student",
      "customer",
      "people",
      "character",
      "stickman",
    ],
    paths: [
      "M14.03 3.29 C14.6 4.18 14.56 5.35 13.87 6.17 C13.18 6.99 12.04 7.27 11.05 6.86 C10.06 6.44 9.52 5.41 9.63 4.37 C9.73 3.33 10.45 2.41 11.51 2.19 C12.56 1.97 13.57 2.55 14.07 3.46",
      "M12.04 7.25 Q12.24 10.83 12.03 14.41",
      "M6.43 10.63 Q9.21 9.83 12.04 9.22 Q14.76 10.18 17.61 10.65",
      "M11.97 14.23 Q10.37 17.87 8.14 21.15",
      "M11.99 14.2 Q14.17 17.5 15.85 21.08",
    ],
  },
  {
    id: "mobile",
    name: "Mobile",
    category: "people",
    role: "actor",
    keywords: [
      "phone",
      "smartphone",
      "ios",
      "android",
      "app",
      "device",
      "cell",
    ],
    paths: [
      "M10.8 2.5 Q12.97 2.74 15.14 2.53 Q17.54 2.55 17.54 4.95 Q17.52 12.01 17.5 19.07 Q17.49 21.47 15.09 21.48 Q11.98 21.27 8.87 21.48 Q6.47 21.48 6.48 19.08 Q7.21 11.98 6.53 4.87 Q6.54 2.47 8.94 2.49 Q10.33 2.55 11.7 2.37",
      "M10.55 18.55 Q11.99 18.45 13.43 18.55",
      "M10.8 5.35 Q11.99 5.43 13.16 5.25",
    ],
  },
  {
    id: "browser",
    name: "Browser",
    category: "people",
    role: "actor",
    keywords: [
      "web",
      "client",
      "website",
      "web app",
      "frontend",
      "window",
      "page",
    ],
    paths: [
      "M9.08 4.01 Q14.18 3.9 19.28 4.02 Q21.48 4.02 21.48 6.22 Q21.85 12.01 21.49 17.81 Q21.5 20.01 19.3 20.01 Q11.99 19.68 4.69 20.04 Q2.49 20.05 2.49 17.85 Q2.81 12.03 2.51 6.21 Q2.51 4.01 4.71 4.01 Q7.35 4.3 9.98 4.05",
      "M2.81 8.68 Q12.04 7.91 21.28 8.51",
      "M5.37 6.3 L5.39 6.31",
      "M7.74 6.36 L7.76 6.37",
      "M10.04 6.38 L10.06 6.39",
    ],
  },
  {
    id: "server",
    name: "Server",
    category: "compute",
    role: "compute",
    keywords: [
      "host",
      "machine",
      "backend",
      "instance",
      "node",
      "box",
      "ec2",
      "on-prem",
    ],
    paths: [
      "M9.09 3.52 Q14.14 3.38 19.18 3.48 Q20.98 3.48 20.99 5.28 Q21.11 7.26 21.01 9.24 Q21.02 11.04 19.22 11.04 Q12.02 10.8 4.81 11.04 Q3.01 11.04 3 9.24 Q3.14 7.29 2.98 5.35 Q2.97 3.55 4.77 3.54 Q7.39 3.76 9.99 3.43",
      "M9.1 13.02 Q14.18 13.4 19.25 12.98 Q21.05 12.97 21.03 14.77 Q21.01 16.72 21 18.67 Q20.99 20.47 19.19 20.47 Q12.01 19.74 4.84 20.46 Q3.04 20.46 3.02 18.66 Q2.84 16.75 2.98 14.84 Q2.95 13.04 4.75 13.04 Q7.38 12.98 10 12.87",
      "M6.99 7.29 L7.01 7.3",
      "M7 16.78 L7.02 16.79",
      "M11.01 7.28 Q14.09 7.45 17.17 7.28",
      "M10.99 16.77 Q14.02 16.44 17.05 16.73",
    ],
  },
  {
    id: "database",
    name: "Database",
    category: "data",
    role: "data",
    keywords: [
      "db",
      "sql",
      "rdbms",
      "postgres",
      "mysql",
      "storage",
      "store",
      "persistence",
      "cylinder",
      "aws rds",
      "aws aurora",
      "azure sql",
      "gcp cloud sql",
    ],
    paths: [
      "M11.3 8.06 C8.06 7.96 5.43 7.12 4.76 6.02 C4.1 4.92 5.53 3.79 8.38 3.24 C11.24 2.69 14.86 2.8 17.27 3.6 C19.67 4.4 20.31 5.65 18.81 6.68 C17.32 7.72 14 8.23 10.79 8.04",
      "M4.5 5.46 Q4.27 12.11 4.49 18.75",
      "M19.52 5.45 Q19.87 12.05 19.52 18.66",
      "M4.55 18.5 C4.55 19.93 7.91 21.06 12 21.06 C16.09 21.06 19.56 19.95 19.56 18.5",
      "M4.47 12 C4.47 13.44 7.79 14.64 12 14.64 C16.21 14.64 19.55 13.45 19.55 12",
    ],
  },
  {
    id: "cache",
    name: "Cache",
    category: "cache",
    role: "cache",
    keywords: [
      "redis",
      "memcached",
      "elasticache",
      "in-memory",
      "fast",
      "hot",
      "bolt",
      "ttl",
      "aws elasticache",
      "azure cache for redis",
      "gcp memorystore",
    ],
    paths: [
      "M10.55 8.02 C7.36 7.8 4.84 6.91 4.5 5.77 C4.16 4.63 6.03 3.56 9.05 3.11 C12.08 2.66 15.58 2.96 17.69 3.82 C19.81 4.69 20.11 5.94 18.34 6.9 C16.57 7.86 13.21 8.34 10 8.04",
      "M4.51 5.48 Q4.56 12.09 4.51 18.7",
      "M19.47 5.54 Q19.11 12.06 19.52 18.58",
      "M4.53 18.5 C4.53 19.93 7.79 21.14 12 21.14 C16.21 21.14 19.49 19.93 19.49 18.5",
      "M10.97 10.99 Q9.76 12.54 8.55 14.1 Q8.25 14.5 8.75 14.51 Q9.8 14.56 10.85 14.54 Q11.35 14.55 11.28 15.05 Q11.23 16.46 10.91 17.84 Q10.85 18.34 11.16 17.94 Q12.74 15.6 14.64 13.51 Q14.95 13.11 14.45 13.11 Q13.38 13.06 12.3 13.08 Q11.8 13.07 11.87 12.58 Q12.26 11.2 12.24 9.76 Q12.31 9.26 12 9.66 Q11.28 10.66 10.5 11.62",
    ],
  },
  {
    id: "queue",
    name: "Queue",
    category: "messaging",
    role: "messaging",
    keywords: [
      "message queue",
      "sqs",
      "rabbitmq",
      "mq",
      "fifo",
      "buffer",
      "jobs",
      "backlog",
      "aws sqs",
      "azure service bus",
      "azure queue storage",
    ],
    paths: [
      "M4.08 6.98 Q4.79 7.02 5.5 7 Q6.5 7.01 6.5 8.01 Q6.53 11.99 6.49 15.97 Q6.49 16.97 5.49 16.97 Q4.49 17.03 3.5 16.99 Q2.5 16.99 2.49 15.99 Q2.51 11.97 2.47 7.95 Q2.47 6.95 3.47 6.97 Q4.03 7.06 4.59 6.92",
      "M9.6 7.01 Q10.31 6.88 11.01 7 Q12.01 7 12.02 8 Q11.99 11.99 12.02 15.99 Q12.03 16.99 11.03 17 Q10.03 17.16 9.03 17 Q8.03 17.01 8.03 16.01 Q8.24 12.01 8 8.02 Q8 7.02 9 7.01 Q9.57 6.98 10.11 7.16",
      "M15.07 6.99 Q15.79 7 16.51 6.99 Q17.51 6.98 17.51 7.98 Q17.84 11.99 17.51 16 Q17.51 17 16.51 16.99 Q15.49 16.95 14.48 16.98 Q13.48 16.98 13.48 15.98 Q13.41 11.99 13.46 8 Q13.46 7 14.46 6.99 Q15.02 7.05 15.59 7.09",
      "M18.84 12.03 Q20.24 12.23 21.65 12.05",
      "M20.29 13.25 Q21.07 12.75 21.64 12.02 Q20.94 11.43 20.26 10.82",
    ],
  },
  {
    id: "load-balancer",
    name: "Load Balancer",
    category: "network",
    role: "network",
    keywords: [
      "lb",
      "balancer",
      "distribute",
      "traffic",
      "round robin",
      "alb",
      "elb",
      "nlb",
      "ha",
      "aws elb",
      "aws alb",
      "aws nlb",
      "azure load balancer",
      "gcp cloud load balancing",
    ],
    paths: [
      "M14.19 4.03 C14.62 4.99 14.36 6.11 13.57 6.8 C12.78 7.49 11.62 7.64 10.71 7.07 C9.81 6.51 9.4 5.42 9.67 4.39 C9.93 3.37 10.86 2.69 11.89 2.64 C12.93 2.6 13.93 3.17 14.29 4.18",
      "M12.05 7.65 Q11.97 12.15 11.96 16.64",
      "M10.6 6.96 Q7.6 11.64 5.16 16.64",
      "M13.44 6.97 Q16.02 11.82 18.8 16.56",
      "M3.33 19.99 C2.85 19.26 2.89 18.29 3.45 17.62 C4.01 16.94 4.95 16.7 5.77 17.04 C6.59 17.37 7.12 18.2 7.03 19.09 C6.95 19.98 6.26 20.66 5.41 20.84 C4.56 21.03 3.68 20.64 3.25 19.87",
      "M10.1 18.34 C10.35 17.51 11.08 16.88 11.97 16.86 C12.86 16.85 13.61 17.46 13.88 18.29 C14.15 19.11 13.89 20.04 13.16 20.55 C12.44 21.06 11.49 20.97 10.81 20.45 C10.13 19.93 9.85 19.03 10.15 18.21",
      "M19.05 20.88 C18.18 20.9 17.39 20.36 17.11 19.53 C16.83 18.71 17.12 17.79 17.83 17.28 C18.54 16.76 19.52 16.73 20.23 17.27 C20.94 17.81 21.2 18.75 20.9 19.59 C20.6 20.42 19.79 20.96 18.91 20.92",
    ],
  },
  {
    id: "api",
    name: "API",
    category: "compute",
    role: "compute",
    keywords: [
      "rest",
      "endpoint",
      "interface",
      "json",
      "graphql",
      "grpc",
      "http",
      "sdk",
    ],
    paths: [
      "M8.77 3.44 C6.55 3.54 6.99 5.24 7.02 7.82 C6.94 10.38 6.61 11.64 4.63 11.99 C6.65 12.45 7 13.6 7.05 16.22 C7.02 18.8 6.63 20.5 8.78 20.56",
      "M15.15 3.47 C17.36 3.49 16.94 5.24 17 7.85 C16.96 10.41 17.45 11.66 19.35 12.07 C17.45 12.35 16.95 13.62 16.93 16.19 C16.95 18.82 17.34 20.51 15.14 20.5",
      "M9.83 11.99 L9.85 12",
      "M11.98 11.95 L12 11.96",
      "M14.2 12.01 L14.22 12.02",
    ],
  },
  {
    id: "cloud",
    name: "Cloud",
    category: "external",
    role: "external",
    keywords: [
      "cloud provider",
      "hosting",
      "aws",
      "gcp",
      "azure",
      "saas",
      "remote",
      "internet",
    ],
    paths: [
      "M7.01 18.52 C4.22 18.5 2.52 16.66 2.48 14.24 C2.45 11.97 4.34 10.32 6.58 10.26 C7.18 7.01 9.56 5.02 12.66 5.01 C16.04 5.01 18.43 7.58 18.76 10.83 C20.83 11.23 21.76 12.92 21.81 14.55 C21.83 16.86 20.14 18.55 17.8 18.52 L6.2 18.56",
    ],
  },
  {
    id: "lock",
    name: "Lock",
    category: "security",
    role: "security",
    keywords: [
      "auth",
      "secure",
      "locked",
      "encryption",
      "private",
      "protected",
      "padlock",
      "tls",
    ],
    paths: [
      "M9.82 10.5 Q13.68 10.59 17.55 10.53 Q19.55 10.54 19.54 12.54 Q19.45 15.78 19.49 19.03 Q19.48 21.03 17.48 21.02 Q11.97 21.14 6.47 20.97 Q4.47 20.96 4.47 18.96 Q4.67 15.72 4.5 12.48 Q4.51 10.48 6.51 10.48 Q8.62 10.54 10.72 10.69",
      "M7.98 10.34 Q8.09 8.94 7.95 7.53",
      "M7.99 7.5 C7.99 5.29 9.8 3.51 12 3.51 C14.2 3.51 16.04 5.27 16.04 7.5",
      "M15.98 7.48 Q15.93 8.87 16.03 10.26",
      "M12.66 13.71 C13.14 14 13.34 14.57 13.2 15.1 C13.07 15.63 12.62 16.02 12.07 16.05 C11.52 16.08 11.03 15.74 10.84 15.23 C10.65 14.72 10.81 14.15 11.24 13.82 C11.67 13.48 12.27 13.48 12.71 13.79",
      "M12.03 16.24 Q12.15 17.09 11.99 17.92",
    ],
  },
  {
    id: "user",
    name: "User",
    category: "people",
    role: "actor",
    keywords: [
      "person",
      "people",
      "account",
      "profile",
      "customer",
      "human",
      "member",
    ],
    paths: [
      "M9.18 10.19 C8.09 8.91 8.02 7.06 8.98 5.68 C9.94 4.31 11.71 3.72 13.29 4.31 C14.88 4.9 15.93 6.46 15.76 8.17 C15.6 9.88 14.26 11.21 12.59 11.48 C10.92 11.75 9.21 10.93 8.51 9.34",
      "M4.54 20.52 C4.92 19.8 5.56 17.31 6.8 16.21 C8.03 15.11 10.22 13.92 11.96 13.92 C13.69 13.92 15.95 15.12 17.21 16.23 C18.48 17.33 19.17 19.83 19.56 20.55",
    ],
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    category: "external",
    role: "data",
    keywords: ["postgresql", "logo", "brand", "pg", "postgres"],
    paths: [
      "M23.5594 14.7228a.5269.5269 0 0 0-.0563-.1191c-.139-.2632-.4768-.3418-1.0074-.2321-1.6533.3411-2.2935.1312-2.5256-.0191 1.342-2.0482 2.445-4.522 3.0411-6.8297.2714-1.0507.7982-3.5237.1222-4.7316a1.5641 1.5641 0 0 0-.1509-.235C21.6931.9086 19.8007.0248 17.5099.0005c-1.4947-.0158-2.7705.3461-3.1161.4794a9.449 9.449 0 0 0-.5159-.0816 8.044 8.044 0 0 0-1.3114-.1278c-1.1822-.0184-2.2038.2642-3.0498.8406-.8573-.3211-4.7888-1.645-7.2219.0788C.9359 2.1526.3086 3.8733.4302 6.3043c.0409.818.5069 3.334 1.2423 5.7436.4598 1.5065.9387 2.7019 1.4334 3.582.553.9942 1.1259 1.5933 1.7143 1.7895.4474.1491 1.1327.1441 1.8581-.7279.8012-.9635 1.5903-1.8258 1.9446-2.2069.4351.2355.9064.3625 1.39.3772a.0569.0569 0 0 0 .0004.0041 11.0312 11.0312 0 0 0-.2472.3054c-.3389.4302-.4094.5197-1.5002.7443-.3102.064-1.1344.2339-1.1464.8115-.0025.1224.0329.2309.0919.3268.2269.4231.9216.6097 1.015.6331 1.3345.3335 2.5044.092 3.3714-.6787-.017 2.231.0775 4.4174.3454 5.0874.2212.5529.7618 1.9045 2.4692 1.9043.2505 0 .5263-.0291.8296-.0941 1.7819-.3821 2.5557-1.1696 2.855-2.9059.1503-.8707.4016-2.8753.5388-4.1012.0169-.0703.0357-.1207.057-.1362.0007-.0005.0697-.0471.4272.0307a.3673.3673 0 0 0 .0443.0068l.2539.0223.0149.001c.8468.0384 1.9114-.1426 2.5312-.4308.6438-.2988 1.8057-1.0323 1.5951-1.6698zM2.371 11.8765c-.7435-2.4358-1.1779-4.8851-1.2123-5.5719-.1086-2.1714.4171-3.6829 1.5623-4.4927 1.8367-1.2986 4.8398-.5408 6.108-.13-.0032.0032-.0066.0061-.0098.0094-2.0238 2.044-1.9758 5.536-1.9708 5.7495-.0002.0823.0066.1989.0162.3593.0348.5873.0996 1.6804-.0735 2.9184-.1609 1.1504.1937 2.2764.9728 3.0892.0806.0841.1648.1631.2518.2374-.3468.3714-1.1004 1.1926-1.9025 2.1576-.5677.6825-.9597.5517-1.0886.5087-.3919-.1307-.813-.5871-1.2381-1.3223-.4796-.839-.9635-2.0317-1.4155-3.5126zm6.0072 5.0871c-.1711-.0428-.3271-.1132-.4322-.1772.0889-.0394.2374-.0902.4833-.1409 1.2833-.2641 1.4815-.4506 1.9143-1.0002.0992-.126.2116-.2687.3673-.4426a.3549.3549 0 0 0 .0737-.1298c.1708-.1513.2724-.1099.4369-.0417.156.0646.3078.26.3695.4752.0291.1016.0619.2945-.0452.4444-.9043 1.2658-2.2216 1.2494-3.1676 1.0128zm2.094-3.988-.0525.141c-.133.3566-.2567.6881-.3334 1.003-.6674-.0021-1.3168-.2872-1.8105-.8024-.6279-.6551-.9131-1.5664-.7825-2.5004.1828-1.3079.1153-2.4468.079-3.0586-.005-.0857-.0095-.1607-.0122-.2199.2957-.2621 1.6659-.9962 2.6429-.7724.4459.1022.7176.4057.8305.928.5846 2.7038.0774 3.8307-.3302 4.7363-.084.1866-.1633.3629-.2311.5454zm7.3637 4.5725c-.0169.1768-.0358.376-.0618.5959l-.146.4383a.3547.3547 0 0 0-.0182.1077c-.0059.4747-.054.6489-.115.8693-.0634.2292-.1353.4891-.1794 1.0575-.11 1.4143-.8782 2.2267-2.4172 2.5565-1.5155.3251-1.7843-.4968-2.0212-1.2217a6.5824 6.5824 0 0 0-.0769-.2266c-.2154-.5858-.1911-1.4119-.1574-2.5551.0165-.5612-.0249-1.9013-.3302-2.6462.0044-.2932.0106-.5909.019-.8918a.3529.3529 0 0 0-.0153-.1126 1.4927 1.4927 0 0 0-.0439-.208c-.1226-.4283-.4213-.7866-.7797-.9351-.1424-.059-.4038-.1672-.7178-.0869.067-.276.1831-.5875.309-.9249l.0529-.142c.0595-.16.134-.3257.213-.5012.4265-.9476 1.0106-2.2453.3766-5.1772-.2374-1.0981-1.0304-1.6343-2.2324-1.5098-.7207.0746-1.3799.3654-1.7088.5321a5.6716 5.6716 0 0 0-.1958.1041c.0918-1.1064.4386-3.1741 1.7357-4.4823a4.0306 4.0306 0 0 1 .3033-.276.3532.3532 0 0 0 .1447-.0644c.7524-.5706 1.6945-.8506 2.802-.8325.4091.0067.8017.0339 1.1742.081 1.939.3544 3.2439 1.4468 4.0359 2.3827.8143.9623 1.2552 1.9315 1.4312 2.4543-1.3232-.1346-2.2234.1268-2.6797.779-.9926 1.4189.543 4.1729 1.2811 5.4964.1353.2426.2522.4522.2889.5413.2403.5825.5515.9713.7787 1.2552.0696.087.1372.1714.1885.245-.4008.1155-1.1208.3825-1.0552 1.717-.0123.1563-.0423.4469-.0834.8148-.0461.2077-.0702.4603-.0994.7662zm.8905-1.6211c-.0405-.8316.2691-.9185.5967-1.0105a2.8566 2.8566 0 0 0 .135-.0406 1.202 1.202 0 0 0 .1342.103c.5703.3765 1.5823.4213 3.0068.1344-.2016.1769-.5189.3994-.9533.6011-.4098.1903-1.0957.333-1.7473.3636-.7197.0336-1.0859-.0807-1.1721-.151zm.5695-9.2712c-.0059.3508-.0542.6692-.1054 1.0017-.055.3576-.112.7274-.1264 1.1762-.0142.4368.0404.8909.0932 1.3301.1066.887.216 1.8003-.2075 2.7014a3.5272 3.5272 0 0 1-.1876-.3856c-.0527-.1276-.1669-.3326-.3251-.6162-.6156-1.1041-2.0574-3.6896-1.3193-4.7446.3795-.5427 1.3408-.5661 2.1781-.463zm.2284 7.0137a12.3762 12.3762 0 0 0-.0853-.1074l-.0355-.0444c.7262-1.1995.5842-2.3862.4578-3.4385-.0519-.4318-.1009-.8396-.0885-1.2226.0129-.4061.0666-.7543.1185-1.0911.0639-.415.1288-.8443.1109-1.3505.0134-.0531.0188-.1158.0118-.1902-.0457-.4855-.5999-1.938-1.7294-3.253-.6076-.7073-1.4896-1.4972-2.6889-2.0395.5251-.1066 1.2328-.2035 2.0244-.1859 2.0515.0456 3.6746.8135 4.8242 2.2824a.908.908 0 0 1 .0667.1002c.7231 1.3556-.2762 6.2751-2.9867 10.5405zm-8.8166-6.1162c-.025.1794-.3089.4225-.6211.4225a.5821.5821 0 0 1-.0809-.0056c-.1873-.026-.3765-.144-.5059-.3156-.0458-.0605-.1203-.178-.1055-.2844.0055-.0401.0261-.0985.0925-.1488.1182-.0894.3518-.1226.6096-.0867.3163.0441.6426.1938.6113.4186zm7.9305-.4114c.0111.0792-.049.201-.1531.3102-.0683.0717-.212.1961-.4079.2232a.5456.5456 0 0 1-.075.0052c-.2935 0-.5414-.2344-.5607-.3717-.024-.1765.2641-.3106.5611-.352.297-.0414.6111.0088.6356.1851z",
    ],
    brand: { hex: "4169E1" },
  },
  {
    id: "redis",
    name: "Redis",
    category: "external",
    role: "cache",
    keywords: ["redis", "logo", "brand"],
    paths: [
      "M22.71 13.145c-1.66 2.092-3.452 4.483-7.038 4.483-3.203 0-4.397-2.825-4.48-5.12.701 1.484 2.073 2.685 4.214 2.63 4.117-.133 6.94-3.852 6.94-7.239 0-4.05-3.022-6.972-8.268-6.972-3.752 0-8.4 1.428-11.455 3.685C2.59 6.937 3.885 9.958 4.35 9.626c2.648-1.904 4.748-3.13 6.784-3.744C8.12 9.244.886 17.05 0 18.425c.1 1.261 1.66 4.648 2.424 4.648.232 0 .431-.133.664-.365a100.49 100.49 0 0 0 5.54-6.765c.222 3.104 1.748 6.898 6.014 6.898 3.819 0 7.604-2.756 9.33-8.965.2-.764-.73-1.361-1.261-.73zm-4.349-5.013c0 1.959-1.926 2.922-3.685 2.922-.941 0-1.664-.247-2.235-.568 1.051-1.592 2.092-3.225 3.21-4.973 1.972.334 2.71 1.43 2.71 2.619z",
    ],
    brand: { hex: "FF4438" },
  },
  {
    id: "apachekafka",
    name: "Apache Kafka",
    category: "external",
    role: "messaging",
    keywords: ["apache kafka", "logo", "brand", "kafka"],
    paths: [
      "M9.71 2.136a1.43 1.43 0 0 0-2.047 0h-.007a1.48 1.48 0 0 0-.421 1.042c0 .41.161.777.422 1.039l.007.007c.257.264.616.426 1.019.426.404 0 .766-.162 1.027-.426l.003-.007c.261-.262.421-.629.421-1.039 0-.408-.159-.777-.421-1.042H9.71zM8.683 22.295c.404 0 .766-.167 1.027-.429l.003-.008c.261-.261.421-.631.421-1.036 0-.41-.159-.778-.421-1.044H9.71a1.42 1.42 0 0 0-1.027-.432 1.4 1.4 0 0 0-1.02.432h-.007c-.26.266-.422.634-.422 1.044 0 .406.161.775.422 1.036l.007.008c.258.262.617.429 1.02.429zm7.89-4.462c.359-.096.683-.33.882-.684l.027-.052a1.47 1.47 0 0 0 .114-1.067 1.454 1.454 0 0 0-.675-.896l-.021-.014a1.425 1.425 0 0 0-1.078-.132c-.36.091-.684.335-.881.686-.2.349-.241.75-.146 1.119.099.363.33.691.675.896h.002c.346.203.737.239 1.101.144zm-6.405-7.342a2.083 2.083 0 0 0-1.485-.627c-.58 0-1.103.242-1.482.627-.378.385-.612.916-.612 1.507s.233 1.124.612 1.514a2.08 2.08 0 0 0 2.967 0c.379-.39.612-.923.612-1.514s-.233-1.122-.612-1.507zm-.835-2.51c.843.141 1.6.552 2.178 1.144h.004c.092.093.182.196.265.299l1.446-.851a3.176 3.176 0 0 1-.047-1.808 3.149 3.149 0 0 1 1.456-1.926l.025-.016a3.062 3.062 0 0 1 2.345-.306c.77.21 1.465.721 1.898 1.482v.002c.431.757.518 1.626.313 2.408a3.145 3.145 0 0 1-1.456 1.928l-.198.118h-.02a3.095 3.095 0 0 1-2.154.201 3.127 3.127 0 0 1-1.514-.944l-1.444.848a4.162 4.162 0 0 1 0 2.879l1.444.846c.413-.47.939-.789 1.514-.944a3.041 3.041 0 0 1 2.371.319l.048.023v.002a3.17 3.17 0 0 1 1.408 1.906 3.215 3.215 0 0 1-.313 2.405l-.026.053-.003-.005a3.147 3.147 0 0 1-1.867 1.436 3.096 3.096 0 0 1-2.371-.318v-.006a3.156 3.156 0 0 1-1.456-1.927 3.175 3.175 0 0 1 .047-1.805l-1.446-.848a3.905 3.905 0 0 1-.265.294l-.004.005a3.938 3.938 0 0 1-2.178 1.138v1.699a3.09 3.09 0 0 1 1.56.862l.002.004c.565.572.914 1.368.914 2.243 0 .873-.35 1.664-.914 2.239l-.002.009a3.1 3.1 0 0 1-2.21.931 3.1 3.1 0 0 1-2.206-.93h-.002v-.009a3.186 3.186 0 0 1-.916-2.239c0-.875.35-1.672.916-2.243v-.004h.002a3.1 3.1 0 0 1 1.558-.862v-1.699a3.926 3.926 0 0 1-2.176-1.138l-.006-.005a4.098 4.098 0 0 1-1.173-2.874c0-1.122.452-2.136 1.173-2.872h.006a3.947 3.947 0 0 1 2.176-1.144V6.289a3.137 3.137 0 0 1-1.558-.864h-.002v-.004a3.192 3.192 0 0 1-.916-2.243c0-.871.35-1.669.916-2.243l.002-.002A3.084 3.084 0 0 1 8.683 0c.861 0 1.641.355 2.21.932v.002h.002c.565.574.914 1.372.914 2.243 0 .876-.35 1.667-.914 2.243l-.002.005a3.142 3.142 0 0 1-1.56.864v1.692zm8.121-1.129l-.012-.019a1.452 1.452 0 0 0-.87-.668 1.43 1.43 0 0 0-1.103.146h.002c-.347.2-.58.529-.677.896-.095.365-.054.768.146 1.119l.007.009c.2.347.519.579.874.673.357.103.755.059 1.098-.144l.019-.009a1.47 1.47 0 0 0 .657-.885 1.493 1.493 0 0 0-.141-1.118",
    ],
    brand: { hex: "231F20" },
  },
  {
    id: "docker",
    name: "Docker",
    category: "external",
    role: "compute",
    keywords: ["docker", "logo", "brand"],
    paths: [
      "M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z",
    ],
    brand: { hex: "2496ED" },
  },
  {
    id: "kubernetes",
    name: "Kubernetes",
    category: "external",
    role: "compute",
    keywords: ["kubernetes", "logo", "brand", "k8s"],
    paths: [
      "M10.204 14.35l.007.01-.999 2.413a5.171 5.171 0 0 1-2.075-2.597l2.578-.437.004.005a.44.44 0 0 1 .484.606zm-.833-2.129a.44.44 0 0 0 .173-.756l.002-.011L7.585 9.7a5.143 5.143 0 0 0-.73 3.255l2.514-.725.002-.009zm1.145-1.98a.44.44 0 0 0 .699-.337l.01-.005.15-2.62a5.144 5.144 0 0 0-3.01 1.442l2.147 1.523.004-.002zm.76 2.75l.723.349.722-.347.18-.78-.5-.623h-.804l-.5.623.179.779zm1.5-3.095a.44.44 0 0 0 .7.336l.008.003 2.134-1.513a5.188 5.188 0 0 0-2.992-1.442l.148 2.615.002.001zm10.876 5.97l-5.773 7.181a1.6 1.6 0 0 1-1.248.594l-9.261.003a1.6 1.6 0 0 1-1.247-.596l-5.776-7.18a1.583 1.583 0 0 1-.307-1.34L2.1 5.573c.108-.47.425-.864.863-1.073L11.305.513a1.606 1.606 0 0 1 1.385 0l8.345 3.985c.438.209.755.604.863 1.073l2.062 8.955c.108.47-.005.963-.308 1.34zm-3.289-2.057c-.042-.01-.103-.026-.145-.034-.174-.033-.315-.025-.479-.038-.35-.037-.638-.067-.895-.148-.105-.04-.18-.165-.216-.216l-.201-.059a6.45 6.45 0 0 0-.105-2.332 6.465 6.465 0 0 0-.936-2.163c.052-.047.15-.133.177-.159.008-.09.001-.183.094-.282.197-.185.444-.338.743-.522.142-.084.273-.137.415-.242.032-.024.076-.062.11-.089.24-.191.295-.52.123-.736-.172-.216-.506-.236-.745-.045-.034.027-.08.062-.111.088-.134.116-.217.23-.33.35-.246.25-.45.458-.673.609-.097.056-.239.037-.303.033l-.19.135a6.545 6.545 0 0 0-4.146-2.003l-.012-.223c-.065-.062-.143-.115-.163-.25-.022-.268.015-.557.057-.905.023-.163.061-.298.068-.475.001-.04-.001-.099-.001-.142 0-.306-.224-.555-.5-.555-.275 0-.499.249-.499.555l.001.014c0 .041-.002.092 0 .128.006.177.044.312.067.475.042.348.078.637.056.906a.545.545 0 0 1-.162.258l-.012.211a6.424 6.424 0 0 0-4.166 2.003 8.373 8.373 0 0 1-.18-.128c-.09.012-.18.04-.297-.029-.223-.15-.427-.358-.673-.608-.113-.12-.195-.234-.329-.349-.03-.026-.077-.062-.111-.088a.594.594 0 0 0-.348-.132.481.481 0 0 0-.398.176c-.172.216-.117.546.123.737l.007.005.104.083c.142.105.272.159.414.242.299.185.546.338.743.522.076.082.09.226.1.288l.16.143a6.462 6.462 0 0 0-1.02 4.506l-.208.06c-.055.072-.133.184-.215.217-.257.081-.546.11-.895.147-.164.014-.305.006-.48.039-.037.007-.09.02-.133.03l-.004.002-.007.002c-.295.071-.484.342-.423.608.061.267.349.429.645.365l.007-.001.01-.003.129-.029c.17-.046.294-.113.448-.172.33-.118.604-.217.87-.256.112-.009.23.069.288.101l.217-.037a6.5 6.5 0 0 0 2.88 3.596l-.09.218c.033.084.069.199.044.282-.097.252-.263.517-.452.813-.091.136-.185.242-.268.399-.02.037-.045.095-.064.134-.128.275-.034.591.213.71.248.12.556-.007.69-.282v-.002c.02-.039.046-.09.062-.127.07-.162.094-.301.144-.458.132-.332.205-.68.387-.897.05-.06.13-.082.215-.105l.113-.205a6.453 6.453 0 0 0 4.609.012l.106.192c.086.028.18.042.256.155.136.232.229.507.342.84.05.156.074.295.145.457.016.037.043.09.062.129.133.276.442.402.69.282.247-.118.341-.435.213-.71-.02-.039-.045-.096-.065-.134-.083-.156-.177-.261-.268-.398-.19-.296-.346-.541-.443-.793-.04-.13.007-.21.038-.294-.018-.022-.059-.144-.083-.202a6.499 6.499 0 0 0 2.88-3.622c.064.01.176.03.213.038.075-.05.144-.114.28-.104.266.039.54.138.87.256.154.06.277.128.448.173.036.01.088.019.13.028l.009.003.007.001c.297.064.584-.098.645-.365.06-.266-.128-.537-.423-.608zM16.4 9.701l-1.95 1.746v.005a.44.44 0 0 0 .173.757l.003.01 2.526.728a5.199 5.199 0 0 0-.108-1.674A5.208 5.208 0 0 0 16.4 9.7zm-4.013 5.325a.437.437 0 0 0-.404-.232.44.44 0 0 0-.372.233h-.002l-1.268 2.292a5.164 5.164 0 0 0 3.326.003l-1.27-2.296h-.01zm1.888-1.293a.44.44 0 0 0-.27.036.44.44 0 0 0-.214.572l-.003.004 1.01 2.438a5.15 5.15 0 0 0 2.081-2.615l-2.6-.44-.004.005z",
    ],
    brand: { hex: "326CE5" },
  },
  {
    id: "nginx",
    name: "NGINX",
    category: "external",
    role: "network",
    keywords: ["nginx", "logo", "brand"],
    paths: [
      "M12 0L1.605 6v12L12 24l10.395-6V6L12 0zm6 16.59c0 .705-.646 1.29-1.529 1.29-.631 0-1.351-.255-1.801-.81l-6-7.141v6.66c0 .721-.57 1.29-1.274 1.29H7.32c-.721 0-1.29-.6-1.29-1.29V7.41c0-.705.63-1.29 1.5-1.29.646 0 1.38.255 1.83.81l5.97 7.141V7.41c0-.721.6-1.29 1.29-1.29h.075c.72 0 1.29.6 1.29 1.29v9.18H18z",
    ],
    brand: { hex: "009639" },
  },
  {
    id: "inbox",
    name: "Inbox",
    category: "messaging",
    role: "messaging",
    keywords: ["tray", "incoming", "mailbox", "receive", "messages"],
    paths: [
      "M2.95 12.99 Q4.66 9.52 5.67 5.78 Q5.95 5.03 6.75 5.03 Q11.99 5.28 17.23 5.01 Q18.03 5.01 18.3 5.76 Q19.87 9.32 20.99 13.04",
      "M2.99 12.96 Q3.16 15.61 3.02 18.26 Q3.03 19.46 4.23 19.46 Q12.01 19.97 19.79 19.46 Q20.99 19.46 20.99 18.26 Q20.89 15.63 21 13.01",
      "M3.21 13.03 Q5.37 13.29 7.54 13.02 Q8.04 13.02 8.29 13.45 Q8.89 14.2 9.27 15.08 Q9.52 15.51 10.02 15.51 Q12 15.33 13.98 15.52 Q14.48 15.52 14.74 15.1 Q15.21 14.23 15.78 13.42 Q16.05 13 16.55 13 Q18.69 12.87 20.84 13.04",
    ],
  },
  {
    id: "notification",
    name: "Notification",
    category: "messaging",
    role: "messaging",
    keywords: ["push", "alert", "badge", "unread", "toast", "in-app message"],
    paths: [
      "M13.48 4.02 Q9.36 4.12 5.25 4.03 Q3.45 4.03 3.46 5.83 Q3.09 12.28 3.54 18.72 Q3.55 20.52 5.35 20.52 Q11.76 21.17 18.16 20.52 Q19.96 20.52 19.97 18.72 Q20.26 14.61 20.02 10.5",
      "M19.52 3 C20.64 3.46 21.41 4.59 21.26 5.83 C21.11 7.07 20.17 8.1 18.92 8.29 C17.67 8.47 16.5 7.74 15.99 6.61 C15.49 5.48 15.7 4.11 16.69 3.29 C17.69 2.48 19.1 2.43 20.15 3.17",
      "M6.95 10.53 Q9.58 10.74 12.2 10.49",
      "M7.03 14.54 Q11.56 14.14 16.1 14.5",
    ],
  },
  {
    id: "search-index",
    name: "Search Index",
    category: "data",
    role: "data",
    keywords: [
      "search",
      "index",
      "elasticsearch",
      "opensearch",
      "full text",
      "lucene",
      "solr",
      "algolia",
      "aws opensearch",
      "azure ai search",
    ],
    paths: [
      "M3.06 5.56 Q9.1 5.04 15.16 5.46",
      "M3 10.05 Q6.33 10.13 9.67 10.03",
      "M3.02 14.52 Q5.57 14.62 8.12 14.46",
      "M3 19 Q5.77 18.76 8.55 18.99",
      "M13.17 17.87 C11.42 17.04 10.44 15.15 10.78 13.24 C11.12 11.33 12.6 9.71 14.61 9.53 C16.63 9.36 18.47 10.6 19.16 12.48 C19.84 14.36 19.22 16.48 17.58 17.65 C15.93 18.81 13.7 18.74 12.14 17.45",
      "M18.32 17.33 Q19.55 18.86 20.98 20.21",
    ],
  },
  {
    id: "bucket",
    name: "Bucket",
    category: "data",
    role: "data",
    keywords: [
      "object storage",
      "s3",
      "blob",
      "gcs",
      "storage",
      "files",
      "assets",
      "r2",
      "azure blob",
      "aws s3",
      "amazon s3",
      "azure blob storage",
      "gcp cloud storage",
    ],
    paths: [
      "M13.92 3.68 C17.31 3.93 19.73 4.82 19.93 5.86 C20.12 6.91 18.08 7.88 14.8 8.25 C11.51 8.61 7.8 8.3 5.66 7.47 C3.51 6.64 3.47 5.48 5.48 4.62 C7.49 3.77 11.13 3.4 14.46 3.72",
      "M4.04 6.02 Q5.72 12.73 6.01 19.64",
      "M19.99 5.96 Q19.19 12.88 17.92 19.74",
      "M5.97 19.5 C5.97 20.5 8.66 21.31 12 21.31 C15.34 21.31 18.01 20.5 18.01 19.5",
    ],
  },
  {
    id: "cdn",
    name: "CDN",
    category: "network",
    role: "network",
    keywords: [
      "content delivery",
      "edge cache",
      "distribution",
      "static assets",
      "pop",
      "aws cloudfront",
      "azure front door",
      "gcp cloud cdn",
    ],
    paths: [
      "M14.42 14.1 C13.47 15.2 11.91 15.5 10.61 14.87 C9.31 14.24 8.56 12.83 8.83 11.4 C9.1 9.97 10.34 8.97 11.76 8.86 C13.18 8.76 14.55 9.56 15.03 10.93 C15.52 12.3 15.08 13.85 13.86 14.69",
      "M2.98 4.27 C3.21 3.47 3.95 2.95 4.77 2.93 C5.59 2.92 6.32 3.44 6.58 4.22 C6.83 5 6.56 5.86 5.89 6.33 C5.22 6.81 4.31 6.78 3.66 6.28 C3.01 5.79 2.75 4.92 3.04 4.15",
      "M21.07 4.63 C21.15 5.45 20.7 6.24 19.93 6.56 C19.16 6.88 18.25 6.7 17.7 6.04 C17.16 5.38 17.14 4.46 17.6 3.75 C18.06 3.05 18.92 2.76 19.72 2.99 C20.51 3.21 21.05 3.94 21.07 4.76",
      "M6.47 18.38 C6.83 19.11 6.69 20 6.09 20.56 C5.49 21.13 4.59 21.26 3.87 20.85 C3.14 20.44 2.73 19.62 2.91 18.79 C3.09 17.96 3.82 17.41 4.64 17.34 C5.45 17.27 6.23 17.73 6.54 18.49",
      "M19.76 17.36 C20.57 17.61 21.08 18.37 21.08 19.19 C21.09 20.02 20.58 20.78 19.77 21.03 C18.97 21.28 18.13 20.93 17.66 20.26 C17.2 19.59 17.17 18.67 17.69 18.01 C18.21 17.35 19.1 17.13 19.88 17.43",
      "M9.83 9.76 Q8.13 7.91 6.24 6.25",
      "M14.2 9.85 Q15.77 7.85 17.75 6.27",
      "M9.85 14.14 Q8.12 16.11 6.12 17.8",
      "M14.19 14.16 Q16.13 15.84 17.79 17.81",
    ],
  },
];

export const ALL: IconDef[] = [...STARTER_ICONS];

const MAP = new Map<string, IconDef>(STARTER_ICONS.map((e) => [e.id, e]));

let isLoaded = false;
const listeners = new Set<() => void>();

export function isIconLibraryLoaded(): boolean {
  return isLoaded;
}

export function onIconLibraryLoaded(fn: () => void): () => void {
  if (isLoaded) {
    fn();
    return () => {};
  }
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

let loadPromise: Promise<IconDef[]> | null = null;

export async function loadIconLibrary(): Promise<IconDef[]> {
  if (!loadPromise) {
    loadPromise = Promise.all([
      import("./sketchIcons"),
      import("./brandIcons"),
    ]).then(([sketchMod, brandMod]) => {
      const all = [...sketchMod.SKETCH, ...brandMod.BRAND];
      for (const e of all) {
        MAP.set(e.id, e);
      }
      ALL.length = 0;
      ALL.push(...all);
      isLoaded = true;
      listeners.forEach((fn) => {
        try {
          fn();
        } catch {}
      });
      listeners.clear();
      return all;
    });
  }
  return loadPromise;
}

export const ALIAS: Record<string, string> = {
  socket: "websocket",
  sockets: "websocket",
  ws: "websocket",
  wss: "websocket",
  "web-socket": "websocket",
  "server-sent-events": "sse",
  eventsource: "sse",
  p2p: "peer-to-peer",
  mesh: "peer-to-peer",
  cloudwatch: "monitor",
  "step-functions": "pipeline",
  stepfunctions: "pipeline",
  bedrock: "brain",
  sagemaker: "brain",
  "vertex-ai": "brain",
  memorystore: "cache",
  "cosmos-db": "key-value",
  cosmosdb: "key-value",
  "cloud-run": "container",
  db: "database",
  sql: "database",
  rdbms: "database",
  postgres: "database",
  postgresql: "database",
  mysql: "database",
  mariadb: "database",
  sqlite: "database",
  rds: "database",
  aurora: "database",
  "cloud-sql": "database",
  replica: "database-stack",
  replicas: "database-stack",
  shards: "database-stack",
  mongodb: "document-db",
  mongo: "document-db",
  firestore: "document-db",
  nosql: "document-db",
  dynamodb: "key-value",
  kv: "key-value",
  etcd: "key-value",
  s3: "bucket",
  "aws/s3": "bucket",
  gcs: "bucket",
  r2: "bucket",
  blob: "bucket",
  storage: "bucket",
  "object-storage": "bucket",
  snowflake: "warehouse",
  bigquery: "warehouse",
  redshift: "warehouse",
  "data-warehouse": "warehouse",
  lake: "data-lake",
  lakehouse: "data-lake",
  ebs: "disk",
  volume: "disk",
  hdd: "disk",
  snapshot: "backup",
  glacier: "archive",
  elasticsearch: "search-index",
  opensearch: "search-index",
  neo4j: "graph-db",
  graph: "graph-db",
  tsdb: "time-series",
  influxdb: "time-series",
  pinecone: "vector-db",
  embeddings: "vector-db",
  document: "file",
  directory: "folder",
  redis: "cache",
  memcached: "cache",
  elasticache: "cache",
  ram: "memory",
  ssd: "fast-storage",
  nvme: "fast-storage",
  lambda: "function",
  functions: "function",
  serverless: "function",
  faas: "function",
  "cloud-function": "function",
  ec2: "vm",
  instance: "vm",
  "virtual-machine": "vm",
  ecs: "container",
  fargate: "container",
  docker: "container",
  pod: "container",
  eks: "cluster",
  gke: "cluster",
  aks: "cluster",
  kubernetes: "cluster",
  k8s: "cluster",
  service: "microservice",
  services: "microservice",
  host: "server",
  rack: "server-rack",
  "data-center": "server-rack",
  scheduler: "cron",
  job: "worker",
  processor: "cpu",
  rest: "api",
  graphql: "api",
  grpc: "api",
  endpoint: "api",
  callback: "webhook",
  internet: "globe",
  web: "globe",
  www: "globe",
  cloudfront: "cdn",
  elb: "load-balancer",
  alb: "load-balancer",
  nlb: "load-balancer",
  lb: "load-balancer",
  "api-gateway": "gateway",
  apigateway: "gateway",
  ingress: "gateway",
  route53: "dns",
  domain: "dns",
  vpc: "network",
  subnet: "network",
  lan: "network",
  nginx: "proxy",
  envoy: "proxy",
  "reverse-proxy": "proxy",
  waf: "firewall",
  wireless: "wifi",
  tunnel: "vpn",
  sqs: "queue",
  rabbitmq: "queue",
  mq: "queue",
  kafka: "stream",
  kinesis: "stream",
  msk: "stream",
  sns: "pub-sub",
  pubsub: "pub-sub",
  eventbridge: "event-bus",
  bus: "event-bus",
  email: "mail",
  envelope: "mail",
  message: "chat",
  slack: "chat",
  push: "notification",
  iam: "identity",
  "id-card": "identity",
  kms: "key",
  "api-key": "key",
  cognito: "login",
  auth: "login",
  authentication: "login",
  sso: "login",
  oauth: "login",
  "sign-in": "login",
  secrets: "vault",
  "secrets-manager": "vault",
  secret: "vault",
  jwt: "token",
  ssl: "certificate",
  tls: "certificate",
  cert: "certificate",
  biometric: "fingerprint",
  padlock: "lock",
  verified: "shield-check",
  person: "user",
  customer: "user",
  account: "user",
  team: "users",
  group: "users",
  phone: "mobile",
  smartphone: "mobile",
  computer: "desktop",
  pc: "desktop",
  ipad: "tablet",
  chatbot: "bot",
  helpdesk: "support",
  stripe: "credit-card",
  payments: "credit-card",
  payment: "credit-card",
  billing: "invoice",
  receipt: "invoice",
  twilio: "sms-provider",
  sendgrid: "email-provider",
  ses: "email-provider",
  mailgun: "email-provider",
  openai: "sparkles",
  ai: "sparkles",
  genai: "sparkles",
  llm: "brain",
  model: "brain",
  analytics: "chart",
  external: "third-party",
  vendor: "third-party",
  saas: "third-party",
  integration: "plug",
  plugin: "puzzle",
  git: "git-branch",
  branch: "git-branch",
  commit: "git-commit",
  pr: "pull-request",
  "merge-request": "pull-request",
  ci: "pipeline",
  cicd: "pipeline",
  "ci-cd": "pipeline",
  rocket: "deploy",
  release: "deploy",
  shell: "terminal",
  cli: "terminal",
  console: "terminal",
  test: "test-tube",
  alert: "bell",
  alarm: "bell",
  gear: "settings",
  cog: "settings",
  monitoring: "monitor",
  observability: "monitor",
  gauge: "metrics",
  sliders: "config",
  configuration: "config",
  box: "package",
  artifact: "package",
  ecr: "registry",
  time: "clock",
  refresh: "sync",
  reload: "sync",
  retry: "sync",
  bolt: "lightning",
  flame: "fire",
  stopwatch: "timer",
  idea: "bulb",
  edit: "pencil",
  delete: "trash",
  location: "map-pin",
  pin: "map-pin",
  close: "x",
  done: "check",
  ok: "check",
};
export const BRAND_ALIAS: Record<string, string> = {
  airflow: "apacheairflow",
  bigquery: "googlebigquery",
  bigtable: "googlebigtable",
  cassandra: "apachecassandra",
  chrome: "googlechrome",
  cockroachdb: "cockroachlabs",
  cuda: "nvidia",
  dataflow: "googledataflow",
  druid: "apachedruid",
  envoy: "envoyproxy",
  es: "elasticsearch",
  fb: "facebook",
  firefox: "firefoxbrowser",
  flink: "apacheflink",
  fly: "flydotio",
  flyio: "flydotio",
  gcp: "googlecloud",
  "gcp-pubsub": "googlepubsub",
  gemini: "googlegemini",
  gh: "github",
  "github-actions": "githubactions",
  golang: "go",
  "google-maps": "googlemaps",
  "google-pubsub": "googlepubsub",
  gpay: "googlepay",
  hadoop: "apachehadoop",
  hbase: "apachehbase",
  ig: "instagram",
  java: "openjdk",
  jwt: "jsonwebtokens",
  k8s: "kubernetes",
  kafka: "apachekafka",
  llama: "metaai",
  "meta-ai": "metaai",
  next: "nextdotjs",
  nextjs: "nextdotjs",
  node: "nodedotjs",
  nodejs: "nodedotjs",
  otel: "opentelemetry",
  pg: "postgresql",
  phoenix: "phoenixframework",
  postgres: "postgresql",
  pulsar: "apachepulsar",
  rails: "rubyonrails",
  "s3-compatible": "minio",
  scylla: "scylladb",
  socketio: "socketdotio",
  spanner: "googlecloudspanner",
  spark: "apachespark",
  superset: "apachesuperset",
  tiktok: "tiktok",
  traefik: "traefikproxy",
  twitter: "x",
  vue: "vuedotjs",
  wasm: "webassembly",
};
export const DEFAULT_IDS: string[] = [
  "stick-figure",
  "mobile",
  "browser",
  "server",
  "database",
  "cache",
  "queue",
  "load-balancer",
  "api",
  "cloud",
  "lock",
  "user",
  "postgresql",
  "redis",
  "apachekafka",
  "docker",
  "kubernetes",
  "nginx",
  "aws-lambda",
  "inbox",
  "notification",
  "search-index",
  "bucket",
  "cdn",
];

export const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ");
export function resolveIcon(id: string): IconDef | undefined {
  const n = (id || "").trim().toLowerCase();
  if (!n) return undefined;
  const direct = MAP.get(n) ?? MAP.get(n.replace(/[\s_]+/g, "-"));
  if (direct) return direct;
  const ba =
    BRAND_ALIAS[n] ??
    BRAND_ALIAS[n.replace(/ /g, "")] ??
    BRAND_ALIAS[n.replace(/ /g, "-")];
  if (ba) {
    const b = MAP.get(ba) ?? MAP.get(ba + "-logo");
    if (b) return b;
  }
  const al =
    ALIAS[n] ?? ALIAS[n.replace(/ /g, "-")] ?? ALIAS[n.replace(/ /g, "")];
  if (al) {
    const t = MAP.get(al);
    if (t) return t;
  }
  const slash = n.split("/").pop() || "";
  if (slash && slash !== n) {
    const s = MAP.get(slash);
    if (s) return s;
  }
  if (!isLoaded) {
    loadIconLibrary();
  }
  return undefined;
}
function scoreOne(e: IconDef, n: string): number {
  if (!n) return 0;
  const aid = e.id.replace(/-/g, " ");
  const aname = e.name.toLowerCase();
  if (aid === n) return 1000;
  if (ALIAS[n.replace(/ /g, "-")] === e.id || ALIAS[n] === e.id) return 950;
  if (aname === n) return 900;
  if (e.keywords.includes(n)) return 800;
  if (aid.startsWith(n) || aname.startsWith(n)) return 600;
  if (
    aid.split(" ").some((c) => c.startsWith(n)) ||
    aname.split(" ").some((c) => c.startsWith(n))
  )
    return 550;
  if (e.keywords.some((c) => c.startsWith(n))) return 500;
  if (e.keywords.some((c) => c.split(" ").some((o) => o.startsWith(n))))
    return 450;
  if (aid.includes(n)) return 100;
  if (e.keywords.some((c) => c.includes(n))) return 50;
  return 0;
}
export function searchIcons(query: string, limit = 60): IconDef[] {
  if (!isLoaded) {
    loadIconLibrary();
  }
  const n = norm(query);
  if (!n || limit <= 0) return [];
  const parts = n.split(" ").filter(Boolean);
  const scored: { icon: IconDef; score: number; order: number }[] = [];
  ALL.forEach((d, order) => {
    const g = scoreOne(d, n);
    let y = 0,
      p = 0;
    if (parts.length > 1)
      for (const m of parts) {
        const b = scoreOne(d, m);
        if (b > 0) p++;
        y += b;
      }
    const v = parts.length > 1 ? g * 2 + y + (p / parts.length) * 300 : g;
    if (v > 0) scored.push({ icon: d, score: v, order });
  });
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  const key =
    BRAND_ALIAS[n.replace(/ /g, "")] ?? BRAND_ALIAS[n] ?? n.replace(/ /g, "");
  const bi = scored.findIndex(
    (d) =>
      d.icon.brand && (d.icon.id === key || d.icon.name.toLowerCase() === n),
  );
  if (bi > 0) {
    const [b] = scored.splice(bi, 1);
    scored.unshift(b);
  }
  return scored.slice(0, limit).map((d) => d.icon);
}
export function defaultIcons(): IconDef[] {
  return DEFAULT_IDS.map((id) => resolveIcon(id)).filter(
    (e): e is IconDef => !!e,
  );
}
const escAttr = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
export function luminance(hex: string): number {
  const n = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * n(0) + 0.7152 * n(2) + 0.0722 * n(4);
}
export function brandFill(e: IconDef, isDark: boolean): string {
  if (!e.brand) return "currentColor";
  const l = luminance(e.brand.hex);
  if ((isDark && l < 0.06) || (!isDark && l > 0.8)) return "currentColor";
  return "#" + e.brand.hex;
}
/** Inner SVG markup for a library icon (paths + dot circles, or brand fill). */
export function iconInner(
  id: string,
  opts: { brandFill?: string } = {},
): string {
  const e = resolveIcon(id);
  if (!e) return "";
  if (e.brand)
    return e.paths
      .map(
        (d) =>
          '<path d="' +
          d +
          '" fill="' +
          escAttr(opts.brandFill ?? "#" + (e.brand as { hex: string }).hex) +
          '" stroke="none"/>',
      )
      .join("");
  return (
    e.paths.map((d) => '<path d="' + d + '"/>').join("") +
    (e.circles ?? [])
      .map(
        (c) => '<circle cx="' + c.cx + '" cy="' + c.cy + '" r="' + c.r + '"/>',
      )
      .join("")
  );
}
export function isBrand(id: string): boolean {
  return !!resolveIcon(id)?.brand;
}

/** Edge-icon geometry, mirroring live `Bs`/`El`: bare glyph straddling the top edge. */
export function edgeIconSize(clean: boolean): number {
  return clean ? 24 : 31;
}

export function edgeIconPos(size: number): {
  x: number;
  y: number;
  gap: number;
} {
  const gap = Math.round(size * 0.3);
  return { x: Math.round(size * 1.3), y: -size / 2, gap };
}

/** Standalone SVG for an icon (used for icon-only inserts), mirroring live `Jg`. */
export function iconStandalone(
  id: string,
  color = "#1c1b19",
  dark = false,
  size = 240,
): string {
  const e = resolveIcon(id);
  if (!e) return "";
  if (e.brand) {
    const fill = brandFill(e, dark);
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      size +
      '" height="' +
      size +
      '" viewBox="0 0 24 24" aria-hidden="true"><path d="' +
      e.paths[0] +
      '" fill="' +
      escAttr(fill === "currentColor" ? color : fill) +
      '" stroke="none"/></svg>'
    );
  }
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    size +
    '" height="' +
    size +
    '" viewBox="0 0 24 24" fill="none" stroke="' +
    escAttr(color) +
    '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    iconInner(id) +
    "</svg>"
  );
}

export function iconDataURL(
  id: string,
  color = "#1c1b19",
  dark = false,
): string | null {
  const svg = iconStandalone(id, color, dark);
  return svg
    ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
    : null;
}
