import React, { useState, useEffect } from 'react';

import { 

  deleteGroupFromFirestore, 

  addGroupToFirestore, 

  subscribeToGroups 

} from '../lib/firebase';

export interface Group {

  id: string;

  name: string;

  description?: string;

  members?: string[];

  createdAt?: number;

}

interface GroupWorkViewProps {

  onSelectGroup?: (group: Group) => void;

}

export const GroupWorkView: React.FC<GroupWorkViewProps> = ({ onSelectGroup }) => {

  const [groups, setGroups] = useState<Group[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [newGroupName, setNewGroupName] = useState<string>('');

  const [newGroupDescription, setNewGroupDescription] = useState<string>('');

  useEffect(() => {

    const unsubscribe = subscribeToGroups((fetchedGroups: Group[]) => {

      // Filter out dummy/test group IDs if necessary

      const filteredGroups = fetchedGroups.filter(

        (group) => group.id && !group.id.startsWith('dummy_') && group.id !== 'test-group-id'

      );

      setGroups(filteredGroups);

      setLoading(false);

    });

    return () => unsubscribe();

  }, []);

  const handleGroupCreated = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!newGroupName.trim()) return;

    const newGroup: Group = {

      id: `group_${Date.now()}`,

      name: newGroupName.trim(),

      description: newGroupDescription.trim(),

      createdAt: Date.now(),

      members: []

    };

    // 1. Update local state

    const updatedGroups = [...groups, newGroup];

    setGroups(updatedGroups);

    // 2. Persist to local storage

    try {

      localStorage.setItem('app_groups', JSON.stringify(updatedGroups));

    } catch (err) {

      console.error('Failed to save groups to localStorage:', err);

    }

    // 3. Save to Firestore

    try {

      await addGroupToFirestore(newGroup);

    } catch (err) {

      console.error('Failed to save group to Firestore:', err);

    }

    // Reset Form

    setNewGroupName('');

    setNewGroupDescription('');

    setIsModalOpen(false);

  };

  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {

    e.stopPropagation();

    

    // Update local state immediately

    const updatedGroups = groups.filter((g) => g.id !== groupId);

    setGroups(updatedGroups);

    // Update local storage

    try {

      localStorage.setItem('app_groups', JSON.stringify(updatedGroups));

    } catch (err) {

      console.error('Failed to update localStorage after deletion:', err);

    }

    // Delete from Firestore

    try {

      await deleteGroupFromFirestore(groupId);

    } catch (err) {

      console.error('Failed to delete group from Firestore:', err);

    }

  };

  if (loading) {

    return (

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px' }}>

        <p style={{ color: '#57606a', fontFamily: 'sans-serif' }}>ලෝඩ් වෙමින් පවතී... (Loading...)</p>

      </div>

    );

  }

  return (

    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>

        <h2 style={{ margin: 0, color: '#1f2328' }}>කණ්ඩායම් වැඩමුළුව (Group Work)</h2>

        {groups.length > 0 && (

          <button

            onClick={() => setIsModalOpen(true)}

            style={{

              backgroundColor: '#0969da',

              color: '#ffffff',

              border: 'none',

              borderRadius: '6px',

              padding: '8px 16px',

              fontWeight: 600,

              cursor: 'pointer'

            }}

          >

            + කණ්ඩායමක් සාදන්න

          </button>

        )}

      </div>

      {groups.length === 0 ? (

        <div

          style={{

            border: '2px dashed #d0d7de',

            borderRadius: '12px',

            padding: '64px 32px',

            textAlign: 'center',

            backgroundColor: '#f6f8fa'

          }}

        >

          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>

          <h3 style={{ margin: '0 0 8px 0', color: '#1f2328', fontSize: '20px' }}>

            තවමත් කණ්ඩායම් නිර්මාණය කර නොමැත (No Groups Yet)

          </h3>

          <p style={{ margin: '0 0 24px 0', color: '#57606a', fontSize: '14px' }}>

            නව කණ්ඩායමක් සෑදීමට පහත බොත්තම ක්ලික් කරන්න.

          </p>

          <button

            onClick={() => setIsModalOpen(true)}

            style={{

              backgroundColor: '#0969da',

              color: '#ffffff',

              border: 'none',

              borderRadius: '6px',

              padding: '12px 24px',

              fontSize: '15px',

              fontWeight: 600,

              cursor: 'pointer',

              boxShadow: '0 1px 3px rgba(0,0,0,0.12)'

            }}

          >

            + කණ්ඩායමක් සාදන්න

          </button>

        </div>

      ) : (

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>

          {groups.map((group) => (

            <div

              key={group.id}

              onClick={() => onSelectGroup && onSelectGroup(group)}

              style={{

                border: '1px solid #d0d7de',

                borderRadius: '8px',

                padding: '16px',

                backgroundColor: '#ffffff',

                cursor: 'pointer',

                display: 'flex',

                flexDirection: 'column',

                justify: 'space-between',

                transition: 'box-shadow 0.2s ease-in-out'

              }}

            >

              <div>

                <h4 style={{ margin: '0 0 8px 0', color: '#0969da', fontSize: '16px' }}>{group.name}</h4>

                {group.description && (

                  <p style={{ margin: '0 0 16px 0', color: '#57606a', fontSize: '13px', lineHeight: '1.4' }}>

                    {group.description}

                  </p>

                )}

              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>

                <span style={{ fontSize: '12px', color: '#8c959f' }}>

                  {group.members ? `${group.members.length} සාමාජිකයින්` : '0 සාමාජිකයින්'}

                </span>

                <button

                  onClick={(e) => handleDeleteGroup(group.id, e)}

                  style={{

                    backgroundColor: 'transparent',

                    color: '#cf222e',

                    border: '1px solid #cf222e',

                    borderRadius: '4px',

                    padding: '4px 8px',

                    fontSize: '12px',

                    cursor: 'pointer'

                  }}

                >

                  ඉවත් කරන්න

                </button>

              </div>

            </div>

          ))}

        </div>

      )}

      {isModalOpen && (

        <div

          style={{

            position: 'fixed',

            top: 0,

            left: 0,

            right: 0,

            bottom: 0,

            backgroundColor: 'rgba(14, 18, 22, 0.5)',

            display: 'flex',

            justifyContent: 'center',

            alignItems: 'center',

            zIndex: 1000

          }}

        >

          <div

            style={{

              backgroundColor: '#ffffff',

              borderRadius: '12px',

              padding: '24px',

              width: '100%',

              maxWidth: '480px',

              boxShadow: '0 8px 24px rgba(14,18,22,0.2)'

            }}

          >

            <h3 style={{ margin: '0 0 16px 0', color: '#1f2328' }}>නව කණ්ඩායමක් තනන්න</h3>

            <form onSubmit={handleGroupCreated}>

              <div style={{ marginBottom: '16px' }}>

                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>

                  කණ්ඩායමේ නම (Group Name)

                </label>

                <input

                  type="text"

                  required

                  value={newGroupName}

                  onChange={(e) => setNewGroupName(e.target.value)}

                  placeholder="උදා: කණ්ඩායම A"

                  style={{

                    width: '100%',

                    padding: '8px 12px',

                    borderRadius: '6px',

                    border: '1px solid #d0d7de',

                    boxSizing: 'border-box'

                  }}

                />

              </div>

              <div style={{ marginBottom: '20px' }}>

                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>

                  විස්තරය (Description)

                </label>

                <textarea

                  value={newGroupDescription}

                  onChange={(e) => setNewGroupDescription(e.target.value)}

                  placeholder="කණ්ඩායම පිළිබඳ කෙටි විස්තරයක්..."

                  rows={3}

                  style={{

                    width: '100%',

                    padding: '8px 12px',

                    borderRadius: '6px',

                    border: '1px solid #d0d7de',

                    boxSizing: 'border-box',

                    resize: 'vertical'

                  }}

                />

              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>

                <button

                  type="button"

                  onClick={() => setIsModalOpen(false)}

                  style={{

                    backgroundColor: '#f6f8fa',

                    color: '#24292f',

                    border: '1px solid #d0d7de',

                    borderRadius: '6px',

                    padding: '8px 16px',

                    fontWeight: 500,

                    cursor: 'pointer'

                  }}

                >

                  අවලංගු කරන්න

                </button>

                <button

                  type="submit"

                  style={{

                    backgroundColor: '#1f883d',

                    color: '#ffffff',

                    border: 'none',

                    borderRadius: '6px',

                    padding: '8px 16px',

                    fontWeight: 600,

                    cursor: 'pointer'

                  }}

                >

                  සුරකින්න

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  );

};

export default GroupWorkView;

