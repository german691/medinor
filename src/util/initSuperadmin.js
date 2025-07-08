import { Admin } from "../domains/private/admin/admin.model.js";
import { hashData } from "./hashData.js";

export const initSuperadmin = async () => {
  try {
    const superadminExists = await Admin.findOne({ userType: "superadmin" });
    if (superadminExists) {
      return;
    } else {
      console.log("Se inicializa super administrador por defecto");
    }

    const { DEFAULT_SUPERADMIN_USERNAME, DEFAULT_SUPERADMIN_PASSWORD } =
      process.env;
    const username = DEFAULT_SUPERADMIN_USERNAME || "superadmin";
    const password = DEFAULT_SUPERADMIN_PASSWORD || "superadmin";

    const hashedPassword = await hashData(password);

    const superadminObj = {
      username,
      password: hashedPassword,
      fullName: "superadmin",
      userType: "superadmin",
    };

    await Admin.create(superadminObj);

    console.log(
      `Superadmin created successfully with credentials username: '${username}' and password: '${password}'`
    );
  } catch (error) {
    console.error("Error creating superadmin:", error);
  }
};
