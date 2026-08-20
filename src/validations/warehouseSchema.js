import * as yup from "yup";

export const getWarehouseSchema = (ma) =>
  yup.object({
    packedQty: yup
      .number("Enter a number")
      .transform((v, o) => o === "" ? 0 : v)
      .integer("Quantity must be a whole number")
      .min(0, "Quantity cannot be less than 0")
      .max(ma, `Quantity cannot exceed ${ma}`),
  });