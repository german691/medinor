import Joi from "joi";

export const clientObjectSchema = Joi.object({
  COD_CLIENT: Joi.string()
    .trim()
    .required()
    .custom((value, helpers) => {
      const saneado = value.toUpperCase().replace(/[^A-Z0-9]/g, "");

      const letras = (saneado.match(/[A-Z]/g) || []).join("");
      const numeros = (saneado.match(/[0-9]/g) || []).join("");

      if (letras.length !== 3 || numeros.length !== 3) {
        return helpers.error("any.invalid", {
          message:
            'El "Cód. Cliente" debe contener 3 letras y 3 números, incluso después de limpiar caracteres no válidos.',
        });
      }

      const codigoFinal = letras + numeros;
      return codigoFinal;
    }, "Limpieza y Validación de Cód. Cliente")
    .messages({
      "any.required": 'El "Cód. Cliente" es un campo requerido.',
    }),

  IDENTIFTRI: Joi.string()
    .trim()
    .required()
    .custom((value, helpers) => {
      const soloNumeros = String(value).replace(/\D/g, "");

      if (soloNumeros.length !== 11) {
        return helpers.error("any.invalid", {
          message:
            'El "Identificador Fiscal" (CUIT) debe contener exactamente 11 dígitos numéricos.',
        });
      }

      return soloNumeros;
    }, "Limpieza y Validación de CUIT")
    .messages({
      "any.required": 'El "Identificador Fiscal" es un campo requerido.',
    }),

  RAZON_SOCI: Joi.string()
    .trim()
    .uppercase()
    .allow("")
    .default("SIN CARGA INICIAL")
    .required()
    .messages({
      "any.required": 'La "Razón Social" es un campo requerido.',
    }),
});

export const clientMigrationSchema = Joi.object({
  clients: Joi.array().items(clientObjectSchema).min(1).required().messages({
    "array.base": 'El campo "clients" debe ser un array.',
    "array.min": "Se debe enviar al menos un cliente para procesar.",
    "any.required":
      'El campo "clients" es requerido en el cuerpo de la petición.',
  }),
});
