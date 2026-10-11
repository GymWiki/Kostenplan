// helper: start app + fx servers losgekoppeld in eigen procesgroep, met pid-bestanden
const { spawn } = require("child_process"); const fs = require("fs"); const S = __dirname;
const app = spawn("npx", ["next", "start", "-p", "3100"], { cwd: "/home/user/Kostenplan", detached: true, stdio: ["ignore", fs.openSync(`${S}/app.log`, "a"), fs.openSync(`${S}/app.log`, "a")],
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9", NEXT_PUBLIC_SUPABASE_ANON_KEY: "x", DATABASE_URL: "postgresql://x:x@127.0.0.1:9/x", BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_abc_x", SNAPSHOT_BASE_URL: "http://127.0.0.1:4010", SNAPSHOT_MIRROR_URL: "http://127.0.0.1:4011" } });
fs.writeFileSync(`${S}/app.pid`, String(app.pid)); app.unref();
const fx = spawn("node", [`${S}/fx-server.js`, "4010"], { detached: true, stdio: "ignore" }); fs.writeFileSync(`${S}/fx4010.pid`, String(fx.pid)); fx.unref();
