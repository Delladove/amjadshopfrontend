import * as yup from "yup";

export const categorySchema = yup.object({
  newCatName: yup
    .string()
    .trim() // stop users from entering only spaces
    .required("Category name is required")
    .matches(
      /^[A-Za-z0-9\s.,()\-&%$#'/]+$/,
      "Category name must be written in English"
    )
    .min(3, "Category name must be at least 3 characters")
    .max(50, "Category name cannot exceed 50 characters"),
});