import { Plus } from 'lucide-react';
import { useTabStore } from '../../store/useTabStore';
import FolderItem from './FolderItem';

export default function FolderTree() {
  const folders = useTabStore((state) => state.folders);
  const selectedFolder = useTabStore((state) => state.selectedFolder);
  const toggleFolder = useTabStore((state) => state.toggleFolder);
  const setSelectedFolder = useTabStore((state) => state.setSelectedFolder);
  const addFolder = useTabStore((state) => state.addFolder);

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
        className="flex h-10 items-center gap-2 pl-7 text-[10px] font-medium text-[#707080] hover:bg-white/5 rounded-lg transition-colors"
        onClick={() => {
          const folderName = prompt('Enter folder name:');
          if (folderName && folderName.trim()) {
            addFolder(folderName.trim());
          }
        }}
      >
        <Plus className="h-3 w-3" strokeWidth={2} />
        <span>New Folder</span>
      </button>
    </div>
  );
}
