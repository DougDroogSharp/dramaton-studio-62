import React from 'react';
import { ScriptCommand, ScriptCommandType } from '@/utils/scriptParser';
import { GameData } from '@/types';
import { POSES, EXPRESSIONS, OPERATORS } from '@/constants';
import { CyberInput } from '@/components/CyberInput';
import { CyberSlider } from '@/components/CyberSlider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';

interface ParameterControlsProps {
  command: ScriptCommand;
  onChange: (updated: ScriptCommand) => void;
  game: GameData;
}

export const ParameterControls: React.FC<ParameterControlsProps> = ({ command, onChange, game }) => {
  const allPoses = [...POSES, ...(game.info.customPoses || [])];
  const allExpressions = [...EXPRESSIONS, ...(game.info.customExpressions || [])];

  // Simple helper to update a field on the command - uses 'any' to bypass union type restrictions
  const updateField = (field: string, value: unknown) => {
    onChange({ ...command, [field]: value } as ScriptCommand);
  };

  switch (command.type) {
    case 'DIALOGUE':
      return (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Select value={command.actorName} onValueChange={(v) => updateField('actorName', v)}>
            <SelectTrigger className="w-[120px] h-7 text-xs bg-diesel-dark border-diesel-border">
              <SelectValue placeholder="Actor" />
            </SelectTrigger>
            <SelectContent className="bg-diesel-panel border-diesel-border z-50">
              {game.actors.map(a => (
                <SelectItem key={a.id} value={a.name} className="text-xs">{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="text"
            value={command.text}
            onChange={(e) => updateField('text', e.target.value)}
            className="flex-1 min-w-0 h-7 px-2 text-xs bg-diesel-dark border border-diesel-border text-diesel-paper focus:border-diesel-rust focus:outline-none"
            placeholder="Dialogue text..."
          />
          <label className="flex items-center gap-1 text-[10px] text-diesel-steel whitespace-nowrap">
            <Checkbox
              checked={command.style === 'thought'}
              onCheckedChange={(checked) => updateField('style', checked ? 'thought' : 'speech')}
              className="h-4 w-4 border-diesel-border"
            />
            thinking
          </label>
        </div>
      );

    case 'ENTER':
      return (
        <div className="flex items-center gap-2 flex-1">
          <Select value={command.actorId} onValueChange={(v) => updateField('actorId', v)}>
            <SelectTrigger className="w-[120px] h-7 text-xs bg-diesel-dark border-diesel-border">
              <SelectValue placeholder="Actor" />
            </SelectTrigger>
            <SelectContent className="bg-diesel-panel border-diesel-border z-50">
              {game.actors.map(a => (
                <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-diesel-steel text-xs">at</span>
          <input
            type="number"
            value={command.x}
            onChange={(e) => updateField('x', parseFloat(e.target.value) || 0)}
            className="w-14 h-7 px-2 text-xs bg-diesel-dark border border-diesel-border text-diesel-paper text-center"
            min={0} max={100}
          />
          <span className="text-diesel-steel text-xs">,</span>
          <input
            type="number"
            value={command.y}
            onChange={(e) => updateField('y', parseFloat(e.target.value) || 0)}
            className="w-14 h-7 px-2 text-xs bg-diesel-dark border border-diesel-border text-diesel-paper text-center"
            min={0} max={100}
          />
        </div>
      );

    case 'EXIT':
      return (
        <Select value={command.actorId} onValueChange={(v) => updateField('actorId', v)}>
          <SelectTrigger className="w-[120px] h-7 text-xs bg-diesel-dark border-diesel-border">
            <SelectValue placeholder="Actor" />
          </SelectTrigger>
          <SelectContent className="bg-diesel-panel border-diesel-border z-50">
            {game.actors.map(a => (
              <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'MOVE':
      return (
        <div className="flex items-center gap-2 flex-1">
          <Select value={command.actorId} onValueChange={(v) => updateField('actorId', v)}>
            <SelectTrigger className="w-[100px] h-7 text-xs bg-diesel-dark border-diesel-border">
              <SelectValue placeholder="Actor" />
            </SelectTrigger>
            <SelectContent className="bg-diesel-panel border-diesel-border z-50">
              {game.actors.map(a => (
                <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-diesel-steel text-xs">to</span>
          <input
            type="number"
            value={command.x}
            onChange={(e) => updateField('x', parseFloat(e.target.value) || 0)}
            className="w-12 h-7 px-1 text-xs bg-diesel-dark border border-diesel-border text-diesel-paper text-center"
            min={0} max={100}
          />
          <span className="text-diesel-steel text-xs">,</span>
          <input
            type="number"
            value={command.y}
            onChange={(e) => updateField('y', parseFloat(e.target.value) || 0)}
            className="w-12 h-7 px-1 text-xs bg-diesel-dark border border-diesel-border text-diesel-paper text-center"
            min={0} max={100}
          />
          <span className="text-diesel-steel text-xs">over</span>
          <input
            type="number"
            value={command.duration}
            onChange={(e) => updateField('duration', parseFloat(e.target.value) || 0.5)}
            step={0.1}
            className="w-14 h-7 px-1 text-xs bg-diesel-dark border border-diesel-border text-diesel-paper text-center"
            min={0} max={10}
          />
          <span className="text-diesel-steel text-xs">s</span>
        </div>
      );

    case 'POSE':
      return (
        <div className="flex items-center gap-2 flex-1">
          <Select value={command.actorId} onValueChange={(v) => updateField('actorId', v)}>
            <SelectTrigger className="w-[100px] h-7 text-xs bg-diesel-dark border-diesel-border">
              <SelectValue placeholder="Actor" />
            </SelectTrigger>
            <SelectContent className="bg-diesel-panel border-diesel-border z-50">
              {game.actors.map(a => (
                <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={command.pose || ''} onValueChange={(v) => updateField('pose', v || undefined)}>
            <SelectTrigger className="w-[90px] h-7 text-xs bg-diesel-dark border-diesel-border">
              <SelectValue placeholder="Pose" />
            </SelectTrigger>
            <SelectContent className="bg-diesel-panel border-diesel-border z-50">
              <SelectItem value="" className="text-xs text-diesel-steel">None</SelectItem>
              {allPoses.map(p => (
                <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={command.expression || ''} onValueChange={(v) => updateField('expression', v || undefined)}>
            <SelectTrigger className="w-[90px] h-7 text-xs bg-diesel-dark border-diesel-border">
              <SelectValue placeholder="Expression" />
            </SelectTrigger>
            <SelectContent className="bg-diesel-panel border-diesel-border z-50">
              <SelectItem value="" className="text-xs text-diesel-steel">None</SelectItem>
              {allExpressions.map(e => (
                <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'BGM':
    case 'AMBIENCE':
      return (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={command.trackName}
            onChange={(e) => updateField('trackName', e.target.value)}
            className="w-32 h-7 px-2 text-xs bg-diesel-dark border border-diesel-border text-diesel-paper"
            placeholder="Track name..."
          />
          <label className="flex items-center gap-1 text-[10px] text-diesel-steel">
            <Checkbox
              checked={command.loop}
              onCheckedChange={(checked) => updateField('loop', !!checked)}
              className="h-4 w-4 border-diesel-border"
            />
            loop
          </label>
          <span className="text-diesel-steel text-[10px]">vol:</span>
          <input
            type="range"
            min={0} max={100} step={5}
            value={Math.round(command.volume * 100)}
            onChange={(e) => updateField('volume', parseInt(e.target.value) / 100)}
            className="w-16 h-2 accent-diesel-rust"
          />
          <span className="text-diesel-steel text-[10px] w-8">{Math.round(command.volume * 100)}%</span>
        </div>
      );

    case 'SFX':
      return (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={command.effectName}
            onChange={(e) => updateField('effectName', e.target.value)}
            className="w-32 h-7 px-2 text-xs bg-diesel-dark border border-diesel-border text-diesel-paper"
            placeholder="Effect name..."
          />
          <span className="text-diesel-steel text-[10px]">vol:</span>
          <input
            type="range"
            min={0} max={100} step={5}
            value={Math.round((command.volume ?? 1) * 100)}
            onChange={(e) => updateField('volume', parseInt(e.target.value) / 100)}
            className="w-16 h-2 accent-diesel-rust"
          />
          <span className="text-diesel-steel text-[10px] w-8">{Math.round((command.volume ?? 1) * 100)}%</span>
        </div>
      );

    case 'EFFECT':
      return (
        <div className="flex items-center gap-2">
          <Select value={command.sfxId} onValueChange={(v) => updateField('sfxId', v)}>
            <SelectTrigger className="w-[100px] h-7 text-xs bg-diesel-dark border-diesel-border">
              <SelectValue placeholder="SFX" />
            </SelectTrigger>
            <SelectContent className="bg-diesel-panel border-diesel-border z-50">
              {game.sfx.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-diesel-steel text-xs">on</span>
          <Select value={command.targetId} onValueChange={(v) => updateField('targetId', v)}>
            <SelectTrigger className="w-[100px] h-7 text-xs bg-diesel-dark border-diesel-border">
              <SelectValue placeholder="Target" />
            </SelectTrigger>
            <SelectContent className="bg-diesel-panel border-diesel-border z-50">
              {game.actors.map(a => (
                <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'CLEAR_EFFECT':
      return (
        <div className="flex items-center gap-2">
          <Select value={command.sfxId} onValueChange={(v) => updateField('sfxId', v)}>
            <SelectTrigger className="w-[100px] h-7 text-xs bg-diesel-dark border-diesel-border">
              <SelectValue placeholder="SFX" />
            </SelectTrigger>
            <SelectContent className="bg-diesel-panel border-diesel-border z-50">
              {game.sfx.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-diesel-steel text-xs">from</span>
          <Select value={command.targetId} onValueChange={(v) => updateField('targetId', v)}>
            <SelectTrigger className="w-[100px] h-7 text-xs bg-diesel-dark border-diesel-border">
              <SelectValue placeholder="Target" />
            </SelectTrigger>
            <SelectContent className="bg-diesel-panel border-diesel-border z-50">
              {game.actors.map(a => (
                <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'WAIT':
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={command.duration}
            onChange={(e) => updateField('duration', parseFloat(e.target.value) || 1)}
            step={0.5}
            className="w-16 h-7 px-2 text-xs bg-diesel-dark border border-diesel-border text-diesel-paper text-center"
            min={0} max={60}
          />
          <span className="text-diesel-steel text-xs">seconds</span>
        </div>
      );

    case 'SCENE':
      return (
        <Select value={command.sceneId} onValueChange={(v) => updateField('sceneId', v)}>
          <SelectTrigger className="w-[150px] h-7 text-xs bg-diesel-dark border-diesel-border">
            <SelectValue placeholder="Scene" />
          </SelectTrigger>
          <SelectContent className="bg-diesel-panel border-diesel-border z-50">
            {game.scenes.map(s => (
              <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'BUTTON':
    case 'HIDE_BUTTON':
      return (
        <Select value={command.buttonId} onValueChange={(v) => updateField('buttonId', v)}>
          <SelectTrigger className="w-[150px] h-7 text-xs bg-diesel-dark border-diesel-border">
            <SelectValue placeholder="Button" />
          </SelectTrigger>
          <SelectContent className="bg-diesel-panel border-diesel-border z-50">
            {game.buttons.map(b => (
              <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'SET':
      return (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={command.variable}
            onChange={(e) => updateField('variable', e.target.value)}
            className="w-24 h-7 px-2 text-xs bg-diesel-dark border border-diesel-border text-diesel-paper font-mono"
            placeholder="variable"
          />
          <span className="text-diesel-steel text-xs">=</span>
          <input
            type="text"
            value={String(command.value)}
            onChange={(e) => {
              const v = e.target.value;
              let parsed: string | number | boolean = v;
              if (v === 'true') parsed = true;
              else if (v === 'false') parsed = false;
              else if (!isNaN(Number(v)) && v !== '') parsed = Number(v);
              updateField('value', parsed);
            }}
            className="w-24 h-7 px-2 text-xs bg-diesel-dark border border-diesel-border text-diesel-paper font-mono"
            placeholder="value"
          />
        </div>
      );

    case 'IF':
      return (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={command.variable}
            onChange={(e) => updateField('variable', e.target.value)}
            className="w-20 h-7 px-2 text-xs bg-diesel-dark border border-diesel-border text-diesel-paper font-mono"
            placeholder="var"
          />
          <Select value={command.operator} onValueChange={(v) => updateField('operator', v)}>
            <SelectTrigger className="w-[60px] h-7 text-xs bg-diesel-dark border-diesel-border font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-diesel-panel border-diesel-border z-50">
              {OPERATORS.map(op => (
                <SelectItem key={op} value={op} className="text-xs font-mono">{op}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="text"
            value={String(command.value)}
            onChange={(e) => {
              const v = e.target.value;
              let parsed: string | number | boolean = v;
              if (v === 'true') parsed = true;
              else if (v === 'false') parsed = false;
              else if (!isNaN(Number(v)) && v !== '') parsed = Number(v);
              updateField('value', parsed);
            }}
            className="w-20 h-7 px-2 text-xs bg-diesel-dark border border-diesel-border text-diesel-paper font-mono"
            placeholder="value"
          />
          <span className="text-diesel-steel text-[10px]">({command.commands.length} nested)</span>
        </div>
      );

    case 'CHOICE': {
      const addOption = () => {
        const newOptions = [...command.options, { text: 'New Option', target: game.scenes[0]?.id || 'scene' }];
        onChange({ ...command, options: newOptions });
      };
      const updateOption = (index: number, field: 'text' | 'target', value: string) => {
        const newOptions = command.options.map((opt, i) => 
          i === index ? { ...opt, [field]: value } : opt
        );
        onChange({ ...command, options: newOptions });
      };
      const removeOption = (index: number) => {
        onChange({ ...command, options: command.options.filter((_, i) => i !== index) });
      };

      return (
        <div className="flex flex-col gap-1 flex-1">
          {command.options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={opt.text}
                onChange={(e) => updateOption(idx, 'text', e.target.value)}
                className="flex-1 h-6 px-2 text-xs bg-diesel-dark border border-diesel-border text-diesel-paper"
                placeholder="Option text..."
              />
              <span className="text-diesel-steel text-[10px]">→</span>
              <Select value={opt.target} onValueChange={(v) => updateOption(idx, 'target', v)}>
                <SelectTrigger className="w-[100px] h-6 text-xs bg-diesel-dark border-diesel-border">
                  <SelectValue placeholder="Scene" />
                </SelectTrigger>
                <SelectContent className="bg-diesel-panel border-diesel-border z-50">
                  {game.scenes.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => removeOption(idx)}
                className="p-1 text-diesel-rust hover:bg-diesel-rust/20"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={addOption}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-diesel-brass hover:bg-diesel-brass/20 border border-diesel-brass/30 w-fit"
          >
            <Plus size={10} /> Add Option
          </button>
        </div>
      );
    }

    case 'COMMENT':
      return (
        <input
          type="text"
          value={command.text}
          onChange={(e) => updateField('text', e.target.value)}
          className="flex-1 h-7 px-2 text-xs bg-diesel-dark border border-diesel-border text-diesel-steel italic"
          placeholder="Comment..."
        />
      );

    case 'UNKNOWN':
      return (
        <input
          type="text"
          value={command.raw}
          onChange={(e) => updateField('raw', e.target.value)}
          className="flex-1 h-7 px-2 text-xs bg-diesel-dark border border-diesel-border text-diesel-rust font-mono"
          placeholder="Raw command..."
        />
      );

    default:
      return <span className="text-diesel-steel text-xs">No parameters</span>;
  }
};
