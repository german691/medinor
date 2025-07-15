import { Admin } from "../domains/private/admin/admin.model.js";
import { Roles } from "../domains/roles.js";
import { hashData } from "./hashData.js";

export const initSuperadmin = async () => {
  try {
    const superadminExists = await Admin.findOne({ role: Roles.SUPERADMIN });
    if (superadminExists) {
      return;
    } else {
      console.log("Se inicializa super administrador por defecto");
    }

    const { DEFAULT_SUPERADMIN_USERNAME, DEFAULT_SUPERADMIN_PASSWORD } =
      process.env;
    const username = DEFAULT_SUPERADMIN_USERNAME || Roles.SUPERADMIN;
    const password = DEFAULT_SUPERADMIN_PASSWORD || Roles.SUPERADMIN;

    const hashedPassword = await hashData(password);

    const superadminObj = {
      username,
      password: hashedPassword,
      fullName: Roles.SUPERADMIN,
      role: Roles.SUPERADMIN,
    };

    await Admin.create(superadminObj);

    console.log(
      `Superadmin created successfully with credentials username: '${username}' and password: '${password}'`
    );
  } catch (error) {
    console.error("Error creating superadmin:", error);
  }
};
