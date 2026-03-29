import { Plus } from 'lucide-react';
import { useTabStore } from '../../store/useTabStore';
import FolderItem from './FolderItem';

export default function FolderTree() {
  const folders = useTabStore((state) => state.folders);
  const selectedFolder = useTabStore((state) => state.selectedFolder);
  const toggleFolder = useTabStore((state) => state.toggleFolder);
  const setSelectedFolder = useTabStore((state) => state.setSelectedFolder);

  const handleFolderToggle = (folderId) => {
    toggleFolder(folderId);
  };

  const handleFolderSelect = (folderId) => {
    setSelectedFolder(folderId === selectedFolder ? null : folderId);
  };

  const renderFolder = (folder, level = 1) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isSelected = selectedFolder === folder.id;

    return (
      <div key={folder.id}>
        <FolderItem
          id={folder.id}
          name={folder.name}
          expanded={folder.expanded}
          selected={isSelected}
          level={level}
          hasChildren={hasChildren}
          showMenu={true}
          onToggle={handleFolderToggle}
          onSelect={handleFolderSelect}
        />

        {hasChildren && folder.expanded && (
          <div className="flex flex-col">
            {folder.children.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-0.5">
      {folders.map((folder) => renderFolder(folder))}

      {/* Add Tab row */}
      <button
        className="flex h-9 items-center gap-2 pl-7 text-xs font-medium text-[#A0A0B0] hover:bg-white/5 rounded-lg transition-colors"
        onClick={() => console.log('Add Tab clicked')}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        <span>Add Tab</span>
      </button>
    </div>
  );
}
