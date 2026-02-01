// =============================================================================
// CONTACT CONTEXT
// =============================================================================
// Manages contact list state and provides functions to refresh/update contacts.
// This allows the contact list to update immediately when contacts are added
// or removed from the User Directory.
// =============================================================================

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { contactAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { useClub } from './ClubContext';

// Create the context
const ContactContext = createContext(null);

// =============================================================================
// CONTACT PROVIDER
// =============================================================================

export function ContactProvider({ children }) {
  const { user } = useAuth();
  const { activeClubId, isLoading: isClubLoading } = useClub();
  const [contacts, setContacts] = useState([]);
  const [contactIds, setContactIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---------------------------------------------------------------------------
  // FETCH CONTACTS
  // ---------------------------------------------------------------------------

  const fetchContacts = useCallback(async () => {
    // Wait for both user and club context to be ready
    if (!user || !activeClubId) {
      setContacts([]);
      setContactIds(new Set());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await contactAPI.getAll();
      const contactList = response.data.data.contacts || [];

      setContacts(contactList);
      setContactIds(new Set(contactList.map(c => c._id)));
    } catch (err) {
      setError(err.message || 'Failed to load contacts');
      console.error('Error fetching contacts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, activeClubId]);

  // ---------------------------------------------------------------------------
  // INITIAL LOAD
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // ---------------------------------------------------------------------------
  // ADD CONTACT
  // ---------------------------------------------------------------------------

  const addContact = useCallback(async (userId) => {
    try {
      const response = await contactAPI.add(userId);
      const newContact = response.data.data.contact;

      // Update state immediately
      setContacts(prev => [...prev, newContact]);
      setContactIds(prev => new Set([...prev, userId]));

      return newContact;
    } catch (err) {
      console.error('Error adding contact:', err);
      throw err;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // REMOVE CONTACT
  // ---------------------------------------------------------------------------

  const removeContact = useCallback(async (userId) => {
    try {
      await contactAPI.remove(userId);

      // Update state immediately
      setContacts(prev => prev.filter(c => c._id !== userId));
      setContactIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (err) {
      console.error('Error removing contact:', err);
      throw err;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // CHECK IF USER IS CONTACT
  // ---------------------------------------------------------------------------

  const isContact = useCallback((userId) => {
    return contactIds.has(userId);
  }, [contactIds]);

  // ---------------------------------------------------------------------------
  // CONTEXT VALUE
  // ---------------------------------------------------------------------------

  const value = {
    contacts,
    contactIds,
    isLoading: isLoading || isClubLoading,
    error,
    fetchContacts,
    addContact,
    removeContact,
    isContact,
  };

  return (
    <ContactContext.Provider value={value}>
      {children}
    </ContactContext.Provider>
  );
}

// =============================================================================
// USE CONTACTS HOOK
// =============================================================================

export function useContacts() {
  const context = useContext(ContactContext);
  if (!context) {
    throw new Error('useContacts must be used within a ContactProvider');
  }
  return context;
}

export default ContactContext;
