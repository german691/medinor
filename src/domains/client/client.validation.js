import Joi from "joi";

/**
 * Schema para validar los datos provenientes del archivo de carga masiva.
 * Este schema es responsable de "limpiar" los datos de entrada (ej: quitar guiones del CUIT).
 */
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

/**
 * Schema para la creación de un cliente desde el CRUD.
 * Espera que los datos ya vengan en el formato final y limpio.
 */
export const createClientSchema = Joi.object({
  cod_client: Joi.string()
    .uppercase()
    .pattern(/^[A-Z]{3}[0-9]{3}$/)
    .required()
    .messages({
      "string.pattern.base": `"Código de Cliente" debe tener el formato LLLNNN.`,
      "any.required": `"Código de Cliente" es un campo obligatorio.`,
    }),

  razon_soci: Joi.string().uppercase().required().messages({
    "any.required": `"Razón Social" es un campo obligatorio.`,
  }),

  identiftri: Joi.string()
    .pattern(/^[0-9]{11}$/)
    .required()
    .messages({
      "string.base": `"CUIT" debe ser un string.`,
      "string.pattern.base": `"CUIT" debe contener exactamente 11 dígitos numéricos.`,
      "any.required": `"CUIT" es un campo obligatorio.`,
    }),

  username: Joi.string().allow("").optional(),
  password: Joi.string().allow("").optional(),
  active: Joi.boolean().default(true),
});

/**
 * Schema para la actualización de un cliente desde el CRUD.
 */
export const updateClientSchema = Joi.object({
  cod_client: Joi.string()
    .uppercase()
    .pattern(/^[A-Z]{3}[0-9]{3}$/)
    .messages({
      "string.pattern.base": `"Código de Cliente" debe tener el formato LLLNNN.`,
    }),

  razon_soci: Joi.string().uppercase(),

  identiftri: Joi.string()
    .pattern(/^[0-9]{11}$/)
    .messages({
      "string.pattern.base": `"CUIT" debe contener exactamente 11 dígitos numéricos.`,
    }),

  username: Joi.string().allow(""),
  password: Joi.string().allow(""),
  active: Joi.boolean(),
})
  .min(1)
  .messages({
    "object.min": "Debe proporcionar al menos un campo para actualizar.",
  });
