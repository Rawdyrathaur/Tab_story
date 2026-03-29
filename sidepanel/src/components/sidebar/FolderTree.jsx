import { Plus } from 'lucide-react';
import { useFolderStore } from '../../store/useTabStore';
import { useUIStore } from '../../store/useTabStore';
import FolderItem from './FolderItem';
import { memo, useCallback, useMemo } from 'react';

/**
 * FolderTree component - renders folder hierarchy
 * @typedef {Object} FolderTreeProps
 */

const FolderTree = memo(function FolderTree() {
  const folders = useFolderStore((state) => state.folders);
  const selectedFolder = useFolderStore((state) => state.selectedFolder);
  const addFolder = useFolderStore((state) => state.addFolder);

  const toggleFolder = useFolderStore((state) => state.toggleFolder);
  const setSelectedFolder = useFolderStore((state) => state.setSelectedFolder);

  const handleFolderToggle = useCallback((folderId) => {
    toggleFolder(folderId);
  }, [toggleFolder]);

  const handleFolderSelect = useCallback((folderId) => {
    setSelectedFolder(folderId === selectedFolder ? null : folderId);
  }, [selectedFolder, setSelectedFolder]);

  const handleAddFolder = useCallback(() => {
    addFolder('New Folder', '');
  }, [addFolder]);

  const renderFolder = useCallback((folder, level = 1) => {
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <FolderItem
          id={folder.id}
          name={folder.name}
          expanded={folder.expanded}
          selected={selectedFolder === folder.id}
          level={level}
          hasChildren={hasChildren}
          showMenu={true}
          onToggle={handleFolderToggle}
          onSelect={handleFolderSelect}
          onMenuClick={(e, folderId) => {
            // TODO: Implement folder menu
          }}
        />

        {hasChildren && folder.expanded && folder.children.map((child) => renderFolder(child, level + 1))}
      </div>
    );
  }, [selectedFolder, handleFolderToggle, handleFolderSelect]);

  return (
    <div className="flex flex-col gap-0.5" role="tree">
      {folders.map((folder) => renderFolder(folder))}

      <button
        onClick={handleAddFolder}
        className="flex h-9 items-center gap-2 pl-7 text-xs font-medium text-[#A0A0B0] hover:bg-white/5 rounded-lg transition-colors"
        type="button"
        aria-label="Add folder"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        <span>Add Folder</span>
      </button>
    </div>
  );
});

export default FolderTree;
