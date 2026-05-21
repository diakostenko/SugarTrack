import { Schema, model } from 'mongoose';

const foodItemSchema = new Schema({
    name: { type: String, required: true },
    barcode: String,
    weight: { type: Number, required: true },
    calories: { type: Number, required: true },
    carbs: { type: Number, required: true },
    protein: { type: Number, required: true },
    fat: { type: Number, required: true }
});

const mealSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    mealType: {
        type: String,
        enum: ['breakfast', 'lunch', 'dinner', 'snack'],
        required: true
    },
    time: {
        type: String,
        required: true
    },
    foods: [foodItemSchema],
    totalCalories: { type: Number, default: 0 },
    totalCarbs: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalFat: { type: Number, default: 0 }
}, {
    timestamps: true
});

mealSchema.pre('save', async function() {
    this.totalCalories = this.foods.reduce((sum, f) => sum + (f.calories || 0), 0);
    this.totalCarbs = this.foods.reduce((sum, f) => sum + (f.carbs || 0), 0);
    this.totalProtein = this.foods.reduce((sum, f) => sum + (f.protein || 0), 0);
    this.totalFat = this.foods.reduce((sum, f) => sum + (f.fat || 0), 0);
});

export const Meal = model('Meal', mealSchema);