// Nep-Brevo voor lokale tests: legt elke verstuurde mail vast in /tmp/brevo-mails.jsonl.
const http = require("http");
const fs = require("fs");
http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    if (req.method === "POST" && req.url.startsWith("/v3/smtp/email")) {
      try {
        const m = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (m.attachment) m.attachment = m.attachment.map((a) => ({ name: a.name, url: a.url, bytes: a.content ? Buffer.from(a.content, "base64").length : undefined, pdf: a.content ? Buffer.from(a.content, "base64").subarray(0, 5).toString() : undefined }));
        fs.appendFileSync("/tmp/brevo-mails.jsonl", JSON.stringify({ tijd: new Date().toISOString(), ...m }) + "\n");
      } catch { /* negeren */ }
      res.statusCode = 201; res.setHeader("content-type", "application/json"); return res.end(JSON.stringify({ messageId: "<test@local>" }));
    }
    res.statusCode = 404; res.end("{}");
  });
}).listen(54400, "127.0.0.1", () => console.log("fake brevo :54400"));
