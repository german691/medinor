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
    discount: { type: Number },
  },
  {
    timestamps: true,
  }
);

productSchema.pre("save", function (next) {
  if (!this.imageUrl) {
    this.imageUrl = this.code;
  }

  if (
    this.medinor_price != null &&
    this.public_price != null &&
    this.public_price !== 0
  ) {
    this.discount = parseFloat(
      (this.medinor_price / this.public_price - 1).toFixed(4)
    );
  } else {
    this.discount = 0;
  }

  next();
});

productSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  let current = {};
  if (!update.medinor_price || !update.public_price) {
    current = await this.model.findOne(this.getQuery()).lean();
  }

  const medinor_price = update.medinor_price ?? current.medinor_price;
  const public_price = update.public_price ?? current.public_price;

  if (medinor_price != null && public_price != null && public_price !== 0) {
    update.discount = parseFloat((medinor_price / public_price - 1).toFixed(4));
  } else {
    update.discount = 0;
  }

  if (!update.imageUrl && (update.code || current.code)) {
    update.imageUrl = update.code ?? current.code;
  }

  next();
});

productSchema.pre("updateOne", async function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  const current = await this.model.findOne(this.getQuery()).lean();

  const medinor_price = update.medinor_price ?? current.medinor_price;
  const public_price = update.public_price ?? current.public_price;

  if (medinor_price != null && public_price != null && public_price !== 0) {
    update.discount = parseFloat((medinor_price / public_price - 1).toFixed(4));
  } else {
    update.discount = 0;
  }

  if (!update.imageUrl && (update.code || current.code)) {
    update.imageUrl = update.code ?? current.code;
  }

  next();
});

export const Product = mongoose.model("Product", productSchema);
