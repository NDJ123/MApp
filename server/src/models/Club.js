// =============================================================================
// CLUB MODEL
// =============================================================================
// Represents an organization/club that users belong to.
//
// Features:
// - Club details (name, image, description)
// - Location information (address, map coordinates)
// - Contact details (email, phone)
// - Default group for all club members
// - Tracks who created the club
//
// Clubs are the primary organizational unit in Padeltalk:
// - Users must belong to at least one club
// - Users can only see/message other members of the same club
// - DMs and groups are scoped to clubs
// =============================================================================

import mongoose from 'mongoose';

// =============================================================================
// ADDRESS SUB-SCHEMA
// =============================================================================

const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    trim: true,
    default: '',
  },
  city: {
    type: String,
    trim: true,
    default: '',
  },
  state: {
    type: String,
    trim: true,
    default: '',
  },
  postalCode: {
    type: String,
    trim: true,
    default: '',
  },
  country: {
    type: String,
    trim: true,
    default: '',
  },
}, { _id: false });

// =============================================================================
// CLUB SCHEMA DEFINITION
// =============================================================================

const clubSchema = new mongoose.Schema(
  {
    // -------------------------------------------------------------------------
    // BASIC INFORMATION
    // -------------------------------------------------------------------------

    name: {
      type: String,
      required: [true, 'Club name is required'],
      trim: true,
      maxlength: [100, 'Club name cannot exceed 100 characters'],
    },

    image: {
      type: String, // URL or base64 data
      default: null,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },

    // -------------------------------------------------------------------------
    // LOCATION INFORMATION
    // -------------------------------------------------------------------------

    address: {
      type: addressSchema,
      default: () => ({}),
    },

    // GeoJSON location for map display and potential proximity searches
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },

    // -------------------------------------------------------------------------
    // CONTACT INFORMATION
    // -------------------------------------------------------------------------

    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },

    contactPhone: {
      type: String,
      trim: true,
      default: '',
    },

    // -------------------------------------------------------------------------
    // RELATIONSHIPS
    // -------------------------------------------------------------------------

    // The auto-created group chat containing all club members
    defaultGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
    },

    // Who created this club (must be a superadmin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // -------------------------------------------------------------------------
    // STATUS
    // -------------------------------------------------------------------------

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    // -------------------------------------------------------------------------
    // SCHEMA OPTIONS
    // -------------------------------------------------------------------------

    timestamps: true,

    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// =============================================================================
// INDEXES
// =============================================================================

// Text search on club name
clubSchema.index({ name: 'text' });

// Geospatial index for location-based queries (future feature)
clubSchema.index({ location: '2dsphere' });

// Index for filtering active clubs
clubSchema.index({ isActive: 1 });

// Index for finding clubs by creator
clubSchema.index({ createdBy: 1 });

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * Get a formatted address string
 * @returns {string} - Formatted address
 */
clubSchema.methods.getFormattedAddress = function () {
  const parts = [];
  if (this.address.street) parts.push(this.address.street);
  if (this.address.city) parts.push(this.address.city);
  if (this.address.state) parts.push(this.address.state);
  if (this.address.postalCode) parts.push(this.address.postalCode);
  if (this.address.country) parts.push(this.address.country);
  return parts.join(', ');
};

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * Get all active clubs
 * @returns {Promise<Club[]>} - Array of active clubs
 */
clubSchema.statics.getActiveClubs = function () {
  return this.find({ isActive: true })
    .populate('createdBy', 'username displayName')
    .sort({ name: 1 });
};

/**
 * Get club by ID with populated references
 * @param {ObjectId} clubId - The club ID
 * @returns {Promise<Club|null>}
 */
clubSchema.statics.getClubWithDetails = function (clubId) {
  return this.findById(clubId)
    .populate('createdBy', 'username displayName avatar')
    .populate('defaultGroup', 'name');
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

const Club = mongoose.model('Club', clubSchema);

export default Club;
