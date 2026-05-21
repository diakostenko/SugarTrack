import { Schema, model } from 'mongoose';

const productSchema = new Schema({
    name: { type: String, required: true },
    nameEn: String,
    category: String,
    gi: { type: Number, default: 0 }, // Гликемический индекс
    per100g: {
        calories: { type: Number, required: true },
        carbs: { type: Number, required: true },
        protein: { type: Number, required: true },
        fat: { type: Number, required: true }
    }
}, {
    timestamps: true
});

// Индекс для быстрого текстового поиска
productSchema.index({ name: 'text', nameEn: 'text' });

export const Product = model('Product', productSchema);