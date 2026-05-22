import { Schema, model } from 'mongoose';

const pillSchema = new Schema({
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

export const Pill = model('Pill', pillSchema);

