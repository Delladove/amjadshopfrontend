import * as yup from "yup";

export const productSchema = yup.object({
  titleEn: yup
    .string()
    .trim()
    .required("English title is required")
    .matches(
      /^[A-Za-z0-9\s.,()\-&%$#'/]+$/,
      "Title must be written in English"
    ).min(3, "Title must be at least 3 characters long"),

  titleUr: yup
    .string()
    .trim()
    .required("Urdu title is required")
    .matches(
      /^[\u0600-\u06FF0-9\u06F0-\u06F9\s،۔()\-&]+$/,
      "Title must be written in Urdu"
    ).min(3, "Title must be at least 3 characters long"),

  unitPrice: yup
    .number()
    .typeError("Enter a valid price")
    .min(1, "Price must be greater than 0")
    .required("Price is required"),
});