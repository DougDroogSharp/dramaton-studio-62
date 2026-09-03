import React from 'react';
import { ScriptCommandType } from '@/utils/scriptParser';
import { COMMAND_DOCS, CATEGORY_INFO, CommandDoc } from '@/utils/scriptDocs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CommandTypeSelectorProps {
  value: ScriptCommandType;
  onChange: (type: ScriptCommandType) => void;
}

// Category colors for badges
const CATEGORY_COLORS: Record<CommandDoc['category'], string> = {
  actor: 'bg-diesel-brass/30 text-diesel-brass border-diesel-brass/50',
  dialogue: 'bg-diesel-paper/30 text-diesel-paper border-diesel-paper/50',
  audio: 'bg-diesel-green/30 text-diesel-green border-diesel-green/50',
  flow: 'bg-diesel-rust/30 text-diesel-rust border-diesel-rust/50',
  effect: 'bg-purple-500/30 text-purple-400 border-purple-500/50',
  scene: 'bg-blue-500/30 text-blue-400 border-blue-500/50',
  button: 'bg-orange-500/30 text-orange-400 border-orange-500/50',
  choice: 'bg-pink-500/30 text-pink-400 border-pink-500/50',
};

export const getCategoryColor = (category: CommandDoc['category']): string => {
  return CATEGORY_COLORS[category] || 'bg-diesel-steel/30 text-diesel-steel border-diesel-steel/50';
};

// Get the category for a command type
export const getCommandCategory = (type: ScriptCommandType): CommandDoc['category'] | null => {
  const doc = COMMAND_DOCS.find(d => d.type === type);
  return doc?.category || null;
};

// Exclude these from the selector
const EXCLUDED_TYPES: ScriptCommandType[] = ['UNKNOWN', 'ENDIF'];

// Group commands by category
const groupedCommands = COMMAND_DOCS
  .filter(doc => !EXCLUDED_TYPES.includes(doc.type))
  .reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, CommandDoc[]>);

// Category order for display
const CATEGORY_ORDER: CommandDoc['category'][] = ['dialogue', 'actor', 'audio', 'effect', 'button', 'choice', 'scene', 'flow'];

export const CommandTypeSelector: React.FC<CommandTypeSelectorProps> = ({ value, onChange }) => {
  const currentDoc = COMMAND_DOCS.find(d => d.type === value);
  const category = currentDoc?.category || 'flow';

  return (
    <Select value={value} onValueChange={(v) => onChange(v as ScriptCommandType)}>
      <SelectTrigger 
        className={`w-[140px] h-7 text-xs font-mono border ${getCategoryColor(category)}`}
      >
        <SelectValue placeholder="Command" />
      </SelectTrigger>
      <SelectContent className="bg-diesel-panel border-diesel-border z-50 max-h-[300px]">
        {CATEGORY_ORDER.map(cat => {
          const commands = groupedCommands[cat];
          if (!commands?.length) return null;
          
          return (
            <SelectGroup key={cat}>
              <SelectLabel className={`text-xs uppercase tracking-wider px-2 py-1 ${getCategoryColor(cat)}`}>
                {CATEGORY_INFO[cat].title}
              </SelectLabel>
              {commands.map(doc => (
                <SelectItem
                  key={doc.type}
                  value={doc.type}
                  className="text-xs font-mono cursor-pointer hover:bg-diesel-rust/20"
                >
                  <div className="flex items-center gap-2">
                    <span>{doc.type}</span>
                    <span className="text-diesel-steel text-[10px] truncate max-w-[100px]">
                      {doc.description.split('.')[0]}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
};
