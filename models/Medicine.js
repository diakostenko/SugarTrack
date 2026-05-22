import { Schema, model } from 'mongoose';

const medicineSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    insulinType: {
        type: String,
        enum: ['short', 'long'],
        required: true
    },
    units: {
        type: Number,
        required: true,
        min: 1
    },
    dosesPerDay: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    doseStates: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

export const Medicine = model('Medicine', medicineSchema);

