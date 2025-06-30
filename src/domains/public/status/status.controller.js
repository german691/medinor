export const handleStatus = async (req, res) => {
  res.status(200).send("Medinor api active");
};

export const endpointNotFound = (req, res) => {
  res.status(404).json({
    status: 404,
    message: "Endpoint not found, perhaps you're using the wrong method?",
    url: req.protocol + "://" + req.get("host") + req.originalUrl,
    body: req.body,
    params: req.params,
    method: req.method,
  });
};
