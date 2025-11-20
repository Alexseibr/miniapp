const validate = (schema) => (req, res, next) => {
  const data = { body: req.body, query: req.query, params: req.params };
  const { error, value } = schema.validate(data, {
    allowUnknown: true,
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  Object.assign(req, value);
  next();
};

module.exports = { validate };
