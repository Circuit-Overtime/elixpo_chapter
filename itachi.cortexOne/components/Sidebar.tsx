import React, { useState } from 'react';
import { AtSymbolIcon, SearchIcon, PlusIcon, FolderIcon, FolderOpenIcon, ChevronDownIcon, GearIcon } from './icons';
import { Session, Project } from '../types';

interface SidebarProps {
    isCollapsed: boolean;
    onNewChat: () => void;
    sessions: Session[];
    projects: Project[];
    activeSessionId: string | null;
    onSessionClick: (id: string) => void;
    onNewProject: () => void;
    onContextMenu: (event: React.MouseEvent, item: Session | Project, type: 'session' | 'project') => void;
    renamingId: string | null;
    onRename: (id: string, newName: string, type: 'session' | 'project') => void;
    onToggleSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    isCollapsed,
    onNewChat,
    sessions,
    projects,
    activeSessionId,
    onSessionClick,
    onNewProject,
    onContextMenu,
    renamingId,
    onRename,
    onToggleSettings
}) => {
    const [openProjects, setOpenProjects] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const handleRenameSubmit = (e: React.FormEvent<HTMLFormElement>, id: string, type: 'session' | 'project') => {
        e.preventDefault();
        const newName = (e.currentTarget.elements.namedItem('rename-input') as HTMLInputElement).value;
        onRename(id, newName, type);
    };

    const toggleProject = (projectId: string) => {
        setOpenProjects(prev => {
            const newSet = new Set(prev);
            if (newSet.has(projectId)) {
                newSet.delete(projectId);
            } else {
                newSet.add(projectId);
            }
            return newSet;
        });
    };

    const filteredSessions = sessions.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const renderSessionItem = (session: Session) => (
        <li key={session.id}>
            {renamingId === session.id ? (
                <form onSubmit={(e) => handleRenameSubmit(e, session.id, 'session')} className="p-2">
                    <input
                        name="rename-input"
                        type="text"
                        defaultValue={session.title}
                        className="w-full bg-gray-700 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        autoFocus
                        onBlur={(e) => (e.target.form as HTMLFormElement).requestSubmit()}
                    />
                </form>
            ) : (
                <button
                    onClick={() => onSessionClick(session.id)}
                    onContextMenu={(e) => onContextMenu(e, session, 'session')}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg truncate transition-colors duration-150 ${activeSessionId === session.id ? 'bg-purple-600/30 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                >
                    {session.title}
                </button>
            )}
        </li>
    );

    if (isCollapsed) {
        return (
            <div className="w-20 bg-[#080808] border-r border-white/10 text-white flex flex-col items-center justify-between py-6 px-2">
                <div className="flex flex-col items-center gap-8">
                    <button onClick={onNewChat} className="text-gray-200 hover:text-white transition-colors">
                        <AtSymbolIcon className="h-7 w-7" />
                    </button>
                </div>
                <div className="flex flex-col items-center gap-4">
                    <button onClick={onToggleSettings} className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700/50">
                        <GearIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-80 bg-[#080808] border-r border-white/10 text-white flex flex-col py-6 px-4 transition-width duration-300 animate-slide-in-left`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <AtSymbolIcon className="h-7 w-7 text-gray-200" />
                    <h1 className="text-xl font-semibold text-gray-200">CortexOne</h1>
                </div>
                <button onClick={onNewChat} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg">
                    <PlusIcon className="h-5 w-5" />
                </button>
            </div>

            <div className="relative mb-4">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700/60 rounded-lg pl-9 pr-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
            </div>

            <div className="flex-grow overflow-y-auto pr-1">
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xs font-bold uppercase text-gray-500">Projects</h2>
                        <button onClick={onNewProject} className="p-1 text-gray-500 hover:text-white hover:bg-gray-700/50 rounded">
                            <PlusIcon className="h-4 w-4" />
                        </button>
                    </div>
                    <ul>
                        {filteredProjects.map(project => (
                            <li key={project.id}>
                                <div
                                    className="flex items-center justify-between w-full text-left text-sm px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-700/50 cursor-pointer"
                                    onClick={() => toggleProject(project.id)}
                                    onContextMenu={(e) => onContextMenu(e, project, 'project')}
                                >
                                    <div className="flex items-center gap-2">
                                        {openProjects.has(project.id) ? <FolderOpenIcon className="h-4 w-4" /> : <FolderIcon className="h-4 w-4" />}
                                        {renamingId === project.id ? (
                                            <form onSubmit={(e) => handleRenameSubmit(e, project.id, 'project')}>
                                                <input
                                                    name="rename-input"
                                                    type="text"
                                                    defaultValue={project.name}
                                                    className="w-full bg-gray-700 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                    autoFocus
                                                    onBlur={(e) => (e.target.form as HTMLFormElement).requestSubmit()}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </form>
                                        ) : (
                                            <span className="truncate">{project.name}</span>
                                        )}
                                    </div>
                                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${openProjects.has(project.id) ? 'rotate-180' : ''}`} />
                                </div>
                                {openProjects.has(project.id) && (
                                    <ul className="pl-6 pt-1 space-y-1">
                                        {filteredSessions.filter(s => s.projectId === project.id).map(renderSessionItem)}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h2 className="text-xs font-bold uppercase text-gray-500 mb-2">Chats</h2>
                    <ul className="space-y-1">
                        {filteredSessions.filter(s => !s.projectId).map(renderSessionItem)}
                    </ul>
                </div>
            </div>

            <div className="pt-4 mt-auto border-t border-gray-700/50">
                <button onClick={onToggleSettings} className="w-full flex items-center gap-3 p-2 rounded-md text-sm font-medium hover:bg-gray-700/50 text-gray-400">
                    <GearIcon className="h-5 w-5" />
                    Settings
                </button>
            </div>
        </div>
    );
};

export default Sidebar;