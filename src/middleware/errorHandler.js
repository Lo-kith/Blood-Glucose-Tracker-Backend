const { ZodError } = require('zod');
module.exports = (err, req, res, next) => {
  if (err instanceof ZodError) {
    const i = err.issues[0];
    return res.status(400).json({ error: { message: i.message, field: i.path[0] } });
  }
  if (err.status) return res.status(err.status).json({ error: { message: err.message, field: err.field } });
  console.error(err);
  res.status(500).json({ error: { message: 'Something went wrong.' } });
};