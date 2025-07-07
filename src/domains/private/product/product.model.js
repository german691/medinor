import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    desc: { type: String },
    extra_desc: { type: String },
    notes: { type: String },
    medinor_price: { type: Number },
    public_price: { type: Number },
    price: { type: Number },
    iva: { type: Boolean, default: false },
    listed: { type: Boolean, default: true },
    lab: { type: mongoose.Schema.Types.ObjectId, ref: "Lab" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    imageUrl: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.pre("save", function (next) {
  if (!this.imageUrl) {
    this.imageUrl = this.code;
  }
  next();
});

productSchema.virtual("discount").get(function () {
  if (
    this.medinor_price != null &&
    this.public_price != null &&
    this.public_price !== 0
  ) {
    return parseFloat((this.medinor_price / this.public_price - 1).toFixed(4));
  }
  return 0;
});

export const Product = mongoose.model("Product", productSchema);
