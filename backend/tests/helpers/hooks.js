// Runs a schema's registered pre-`save` middleware against a document without
// needing a live MongoDB connection.
const runPreSave = (doc) =>
  new Promise((resolve, reject) => {
    doc.schema.s.hooks.execPre('save', doc, [], (err) => (err ? reject(err) : resolve()));
  });

module.exports = { runPreSave };
