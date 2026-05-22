import { Schema, model } from 'mongoose';

const glucoseRecordSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    value: {
        type: Number,
        required: true,
        min: 0,
        max: 30
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    note: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

glucoseRecordSchema.index({ userId: 1, date: -1 });

export const GlucoseRecord = model('GlucoseRecord', glucoseRecordSchema);