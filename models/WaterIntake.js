import { Schema, model } from 'mongoose';

const waterIntakeSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    glasses: {
        type: Number,
        default: 0,
        min: 0,
        max: 20
    },
    amount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

export const WaterIntake = model('WaterIntake', waterIntakeSchema);