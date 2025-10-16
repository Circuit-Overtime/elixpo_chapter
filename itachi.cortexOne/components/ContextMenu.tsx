import React, { useEffect, useRef } from 'react';

interface MenuItem {
    label: string;
    icon: React.FC<{className?: string}>;
    action: () => void;
    className?: string;
    disabled?: boolean;
}

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    items: (MenuItem | null)[];
    menuClassName?: string;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, items, menuClassName }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const menuStyle: React.CSSProperties = {
        top: y,
        left: x,
    };

    return (
        <div 
            ref={menuRef}
            style={menuStyle}
            className={`fixed bg-[#1A1A1A] border border-gray-700/50 rounded-lg shadow-2xl z-50 py-1 animate-fade-in-fast ${menuClassName || 'w-48'}`}
        >
            <ul>
                {items.map((item, index) => {
                    if (item === null) {
                        return <li key={`divider-${index}`} className="border-t border-gray-700/50 my-1"></li>;
                    }
                    return (
                        <li key={index}>
                            <button
                                onClick={() => {
                                    if (item.disabled) return;
                                    item.action();
                                    onClose();
                                }}
                                disabled={item.disabled}
                                className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-3 transition-colors duration-150 ${item.className || 'text-gray-300 hover:bg-gray-700/60'} ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    );
};

export default ContextMenu;