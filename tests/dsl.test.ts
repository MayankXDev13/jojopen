import { describe, test, expect } from "bun:test";
import { parseDSL } from "../src/lib/dsl";

describe("DSL: Nodes and Shapes", () => {
  test("parses simple node declarations with labels and shapes", () => {
    const src = `
      user [person, "End User"]
      web [rectangle, "Web Client"]
      api [rounded, "API Gateway"]
      db [cylinder, "Primary Database"]
    `;
    const res = parseDSL(src);
    expect(res.nodes.size).toBe(4);

    const user = res.nodes.get("user")!;
    expect(user.shape).toBe("person");
    expect(user.label).toBe("End User");
    expect(user.explicit).toBe(true);

    const web = res.nodes.get("web")!;
    expect(web.shape).toBe("rectangle");
    expect(web.label).toBe("Web Client");

    const api = res.nodes.get("api")!;
    expect(api.shape).toBe("rounded");
    expect(api.label).toBe("API Gateway");

    const db = res.nodes.get("db")!;
    expect(db.shape).toBe("cylinder");
    expect(db.label).toBe("Primary Database");
  });

  test("parses colors, roles, and icons", () => {
    const src = `
      auth [security, "Auth Service"]
      cache [orange, "Redis Cache"]
      worker [compute, icon: cpu]
    `;
    const res = parseDSL(src);
    const auth = res.nodes.get("auth")!;
    expect(auth.role).toBe("security");

    const cache = res.nodes.get("cache")!;
    expect(cache.color).toBe("orange");

    const worker = res.nodes.get("worker")!;
    expect(worker.role).toBe("compute");
    expect(worker.icon).toBe("cpu");
  });

  test("implicit nodes are created when referenced in edges", () => {
    const src = `client -> server : "requests"`;
    const res = parseDSL(src);
    expect(res.nodes.has("client")).toBe(true);
    expect(res.nodes.has("server")).toBe(true);
    expect(res.nodes.get("client")!.explicit).toBe(false);
  });
});

describe("DSL: Edges and Connectors", () => {
  test("parses directed, bidirectional, and dashed edges with labels", () => {
    const src = `
      a -> b : "call"
      b <-> c : "sync"
      c --> d : "async event"
    `;
    const res = parseDSL(src);
    expect(res.edges.length).toBe(3);

    expect(res.edges[0].from).toBe("a");
    expect(res.edges[0].to).toBe("b");
    expect(res.edges[0].kind).toBe("sync");
    expect(res.edges[0].label).toBe("call");

    expect(res.edges[1].from).toBe("b");
    expect(res.edges[1].to).toBe("c");
    expect(res.edges[1].kind).toBe("bidirectional");
    expect(res.edges[1].label).toBe("sync");

    expect(res.edges[2].from).toBe("c");
    expect(res.edges[2].to).toBe("d");
    expect(res.edges[2].kind).toBe("async");
    expect(res.edges[2].label).toBe("async event");
  });
});

describe("DSL: Groups, Titles, and Directives", () => {
  test("parses title and direction directives", () => {
    const src = `
      title: System Architecture
      direction: down
      a -> b
    `;
    const res = parseDSL(src);
    expect(res.title).toBe("System Architecture");
    expect(res.direction).toBe("down");
  });

  test("parses markdown-style heading as title without creating a phantom node", () => {
    const src = `
      # URL shortener
      User -> CDN
    `;
    const res = parseDSL(src);
    expect(res.title).toBe("URL shortener");
    expect(res.nodes.has("# URL shortener")).toBe(false);
    expect(res.nodes.size).toBe(2);
  });

  test("parses nested groups and associates nodes with groups", () => {
    const src = `
      group Backend {
        api ["API Layer"]
        group Storage {
          db ["Postgres"]
        }
      }
    `;
    const res = parseDSL(src);
    expect(res.groups.has("Backend")).toBe(true);
    expect(res.groups.has("Storage")).toBe(true);

    const backend = res.groups.get("Backend")!;
    expect(backend.parent).toBeNull();
    expect(backend.children).toContain("Storage");

    const storage = res.groups.get("Storage")!;
    expect(storage.parent).toBe("Backend");

    expect(res.nodes.get("api")!.group).toBe("Backend");
    expect(res.nodes.get("db")!.group).toBe("Storage");
  });
});

describe("DSL: Error Diagnostics", () => {
  test("reports diagnostic error for unmatched closing brace", () => {
    const src = `
      nodeA
      }
    `;
    const res = parseDSL(src);
    const err = res.diagnostics.find((d) => d.severity === "error");
    expect(err).toBeDefined();
    expect(err!.message).toContain("Unmatched '}'");
    expect(err!.line).toBe(3);
  });

  test("reports diagnostic error for invalid direction", () => {
    const src = `direction: diagonal`;
    const res = parseDSL(src);
    const err = res.diagnostics.find((d) => d.severity === "error");
    expect(err).toBeDefined();
    expect(err!.message).toContain("Unknown direction 'diagonal'");
  });

  test("reports diagnostic error when group contains an edge on same line", () => {
    const src = `group BadGroup -> target {`;
    const res = parseDSL(src);
    const err = res.diagnostics.find((d) => d.severity === "error");
    expect(err).toBeDefined();
    expect(err!.message).toContain("A group line cannot contain an edge");
  });
});
