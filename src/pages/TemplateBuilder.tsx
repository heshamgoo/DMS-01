import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { Button } from '../components/ui/Button';
import { Template, TemplateField, FieldType } from '../types';
import { Trash2, Save, ArrowLeft, Type, AlignLeft, Hash, Calendar, ChevronDown, CheckSquare, PenTool, Table as TableIcon, Settings, Plus, Image as ImageIcon, Users } from 'lucide-react';
import { cn } from '../utils/cn';
import { Letterhead } from '../components/Letterhead';
import { Rnd } from 'react-rnd';
import { useCollaboration } from '../store/useCollaboration';

const TOOLBOX_ITEMS = [
  { type: 'static-text', label: 'Static Text', icon: AlignLeft },
  { type: 'text', label: 'Short Text', icon: Type },
  { type: 'textarea', label: 'Long Text', icon: AlignLeft },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'table', label: 'Table', icon: TableIcon },
  { type: 'signature', label: 'Signature', icon: PenTool },
  { type: 'system-serial', label: 'Serial Number', icon: Hash },
  { type: 'system-date', label: 'Current Date', icon: Calendar },
  { type: 'client', label: 'Client Details', icon: Users },
  { type: 'image', label: 'Image/Logo', icon: ImageIcon },
];

export function TemplateBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { templates, addTemplate, updateTemplate, loading: storeLoading } = useStore();
  const { profile, isLoading: authLoading } = useAuthStore();
  const { settings } = useSettingsStore();

  const isNew = !id;
  const existingTemplate = templates.find((t) => t.id === id);

  const depts = settings?.departments || ['General', 'HR', 'Finance', 'Operation', 'Public'];

  console.log('TemplateBuilder state:', { id, isNew, templatesCount: templates.length, storeLoading, authLoading });

  const [template, setTemplate] = useState<Partial<Template>>({
    name: '',
    description: '',
    prefix: 'DOC',
    department: 'General',
    fields: [],
  });

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const { collaborators, sharedData, updateSharedData } = useCollaboration(
    isNew ? 'new-template' : `template-${id}`,
    template
  );

  useEffect(() => {
    if (sharedData && sharedData !== template) {
      setTemplate(sharedData);
    }
  }, [sharedData]);

  const updateTemplateState = (updater: (prev: Partial<Template>) => Partial<Template> | Partial<Template>) => {
    setTemplate((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      updateSharedData(next);
      return next;
    });
  };

  useEffect(() => {
    if (existingTemplate && !isNew) {
      setTemplate(existingTemplate);
      updateSharedData(existingTemplate);
    }
  }, [existingTemplate, isNew]);

  const handleSave = async () => {
    setSaveError(null);
    console.log('handleSave triggered', { template, isNew, existingTemplate });
    if (!template.name || !template.prefix) {
      const msg = 'Name and Prefix are required.';
      console.warn(msg);
      setSaveError(msg);
      return;
    }

    const creatorId = profile?.uid || 'system';
    console.log('Creator ID:', creatorId);

    const newTemplate: Template = {
      id: isNew ? `t${Date.now()}` : (existingTemplate?.id || id!),
      name: template.name!,
      description: template.description || '',
      prefix: template.prefix!,
      type: 'document',
      department: template.department || 'General',
      fields: template.fields || [],
      headerContent: template.headerContent || '',
      footerContent: template.footerContent || '',
      bodyContent: '',
      createdAt: (isNew || !existingTemplate) ? new Date().toISOString() : existingTemplate.createdAt,
      updatedAt: new Date().toISOString(),
      createdBy: (isNew || !existingTemplate) ? creatorId : existingTemplate.createdBy,
    };

    console.log('Template object to save:', newTemplate);
    setIsSaving(true);

    try {
      if (isNew || !existingTemplate) {
        console.log('Calling addTemplate');
        await addTemplate(newTemplate);
      } else {
        console.log('Calling updateTemplate');
        await updateTemplate(newTemplate.id, newTemplate);
      }
      console.log('Save successful, navigating...');
      navigate('/templates');
    } catch (error: any) {
      console.error('Failed to save template:', error);
      setIsSaving(false);
      setSaveError(error.message || 'Failed to save template');
      // Check if it's our custom JSON error
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.operationType) {
          throw error; // Let ErrorBoundary handle it
        }
      } catch (e) {
        // Not a JSON error
      }
    }
  };

  const updateField = (id: string, updates: Partial<TemplateField>) => {
    updateTemplateState((prev) => ({
      ...prev,
      fields: prev.fields?.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  };

  const removeField = (id: string) => {
    updateTemplateState((prev) => ({
      ...prev,
      fields: prev.fields?.filter((f) => f.id !== id),
    }));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const addField = (type: FieldType, x: number, y: number) => {
    const newField: TemplateField = {
      id: `f${Date.now()}`,
      name: `${type}_${Date.now()}`,
      label: `New ${TOOLBOX_ITEMS.find(i => i.type === type)?.label}`,
      type,
      required: false,
      content: type === 'static-text' ? 'Enter your text here...' : undefined,
      options: type === 'dropdown' ? ['Option 1'] : type === 'table' ? ['Column 1', 'Column 2'] : undefined,
      x,
      y,
      w: type === 'table' ? 400 : 200,
      h: type === 'table' ? 150 : type === 'textarea' ? 100 : 60,
      rows: type === 'table' ? 3 : undefined,
      cols: type === 'table' ? 2 : undefined,
    };
    
    updateTemplateState(prev => ({
      ...prev,
      fields: [...(prev.fields || []), newField]
    }));
    setSelectedFieldId(newField.id);
  };

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('type', type);
  };

  if (storeLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-slate-600 font-medium">Loading Template Builder...</p>
        </div>
      </div>
    );
  }

  if (!isNew && !existingTemplate) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-4">Template not found</h2>
        <Button onClick={() => navigate('/templates')}>Back to Templates</Button>
      </div>
    );
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type') as FieldType;
    if (!type || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    addField(type, x, y);
  };

  const selectedField = template.fields?.find(f => f.id === selectedFieldId);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-slate-100 -m-6">
      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/templates')} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={template.name}
              onChange={(e) => updateTemplateState((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Template Name"
              className="text-lg font-bold border-none focus:ring-0 p-0 bg-transparent placeholder:text-slate-400 w-64"
            />
            <div className="h-6 w-px bg-slate-300"></div>
            <select
              value={template.department || 'General'}
              onChange={(e) => updateTemplateState((prev) => ({ ...prev, department: e.target.value as any }))}
              className="text-sm font-medium border-none focus:ring-0 p-0 bg-transparent text-slate-600 cursor-pointer"
            >
              {depts.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <div className="h-6 w-px bg-slate-300"></div>
            <input
              type="text"
              value={template.prefix}
              onChange={(e) => updateTemplateState((prev) => ({ ...prev, prefix: e.target.value.toUpperCase() }))}
              placeholder="PREFIX"
              maxLength={5}
              className="text-sm font-medium border-none focus:ring-0 p-0 bg-transparent placeholder:text-slate-400 w-20 uppercase"
            />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {collaborators.length > 0 && (
            <div className="flex items-center -space-x-2 mr-4">
              {collaborators.map(c => (
                <div 
                  key={c.uid} 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm"
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                >
                  {c.name.charAt(0).toUpperCase()}
                </div>
              ))}
              <div className="text-xs text-slate-500 ml-4 font-medium">
                {collaborators.length} online
              </div>
            </div>
          )}
          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-1 rounded-md text-xs animate-pulse max-w-xs truncate">
              {saveError}
            </div>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="flex items-center">
          {isSaving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isSaving ? 'Saving...' : 'Save Template'}
        </Button>
      </div>
    </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Toolbox */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-10">
          <div className="p-4 border-b border-slate-100 font-semibold text-slate-700 flex items-center">
            <Plus className="w-4 h-4 mr-2" /> Elements
          </div>
          <div className="p-4 space-y-2 overflow-y-auto flex-1">
            <p className="text-xs text-slate-500 mb-4">Drag elements to the canvas</p>
            {TOOLBOX_ITEMS.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => handleDragStart(e, item.type)}
                className="flex items-center p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-grab hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
              >
                <item.icon className="w-4 h-4 mr-3 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center - A4 Canvas */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex justify-center relative">
          {collaborators.map(c => c.cursor && (
            <div 
              key={c.uid}
              className="fixed pointer-events-none z-50 flex flex-col items-center"
              style={{ left: c.cursor.x, top: c.cursor.y, transition: 'all 0.1s ease' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 14.5L14.5 8.5L2.5 2.5V14.5Z" fill={c.color} stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              <div 
                className="px-2 py-1 rounded text-xs text-white font-medium whitespace-nowrap mt-1 shadow-sm"
                style={{ backgroundColor: c.color }}
              >
                {c.name}
              </div>
            </div>
          ))}

          <div className="bg-white shadow-2xl" style={{ width: '210mm', height: '297mm' }}>
            <Letterhead fullPage>
              <div 
                className="relative w-full h-full"
                ref={canvasRef}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => setSelectedFieldId(null)}
              >
                {template.fields?.map((field) => (
                  <Rnd
                    key={field.id}
                    size={{ width: field.w || 200, height: field.h || 60 }}
                    position={{ x: field.x || 0, y: field.y || 0 }}
                    onDragStop={(e, d) => {
                      updateField(field.id, { x: d.x, y: d.y });
                    }}
                    onResizeStop={(e, direction, ref, delta, position) => {
                      updateField(field.id, {
                        w: ref.style.width,
                        h: ref.style.height,
                        ...position,
                      });
                    }}
                    bounds="parent"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFieldId(field.id);
                    }}
                    className={cn(
                      "group rounded-lg border-2 transition-colors bg-white/80 backdrop-blur-sm",
                      selectedFieldId === field.id ? "border-indigo-500 shadow-md z-20" : "border-transparent hover:border-slate-300 z-10"
                    )}
                  >
                    <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeField(field.id); }} 
                        className="p-1.5 bg-white shadow-md border border-slate-200 rounded-full cursor-pointer text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="w-full h-full overflow-hidden p-2 pointer-events-none flex flex-col" style={{
                      fontWeight: field.bold ? 'bold' : 'normal',
                      textAlign: field.align || 'left',
                      color: field.color || 'inherit'
                    }}>
                      {field.type === 'static-text' ? (
                        <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-wrap w-full h-full">
                          {field.content || 'Empty text block'}
                        </div>
                      ) : (
                        <div className="flex flex-col h-full">
                          <label className="text-sm font-semibold text-slate-700 flex items-center mb-1 shrink-0">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          
                          <div className="flex-1 w-full relative">
                            {field.type === 'text' && <div className="absolute inset-0 border border-slate-300 rounded-md bg-white"></div>}
                            {field.type === 'textarea' && <div className="absolute inset-0 border border-slate-300 rounded-md bg-white"></div>}
                            {field.type === 'number' && <div className="absolute inset-0 border border-slate-300 rounded-md bg-white flex items-center px-3 text-slate-400">123</div>}
                            {field.type === 'date' && <div className="absolute inset-0 border border-slate-300 rounded-md bg-white flex items-center px-3 text-slate-400"><Calendar className="w-4 h-4 mr-2"/> dd/mm/yyyy</div>}
                            {field.type === 'dropdown' && <div className="absolute inset-0 border border-slate-300 rounded-md bg-white flex items-center justify-between px-3 text-slate-400"><span>Select option...</span><ChevronDown className="w-4 h-4"/></div>}
                            {field.type === 'checkbox' && <div className="flex items-center space-x-2 h-full"><div className="w-4 h-4 border border-slate-300 rounded bg-white"></div><span className="text-sm text-slate-500">Checkbox option</span></div>}
                            {field.type === 'signature' && <div className="absolute inset-0 border-2 border-dashed border-slate-300 rounded-md bg-slate-50 flex items-center justify-center text-slate-400"><PenTool className="w-6 h-6 mb-2 opacity-50"/></div>}
                            {field.type === 'system-serial' && <div className="absolute inset-0 border border-slate-300 rounded-md bg-slate-50 flex items-center px-3 text-slate-500 font-mono">DOC-2026-0001</div>}
                            {field.type === 'system-date' && <div className="absolute inset-0 border border-slate-300 rounded-md bg-slate-50 flex items-center px-3 text-slate-500 font-mono">24/03/2026</div>}
                            {field.type === 'client' && (
                              <div className="absolute inset-0 border border-slate-300 rounded-md bg-slate-50 flex flex-col justify-center px-3 text-slate-500 text-xs space-y-1">
                                <div className="font-bold text-slate-700">Client Name</div>
                                <div>Address, TRN, Contact...</div>
                              </div>
                            )}
                            {field.type === 'image' && (
                              <div className="absolute inset-0 border-2 border-dashed border-slate-300 rounded-md bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                                <ImageIcon className="w-8 h-8 mb-1 opacity-50"/>
                                <span className="text-[10px]">Image Placeholder</span>
                              </div>
                            )}
                            {field.type === 'table' && (
                              <table className="w-full h-full border-collapse border border-slate-300 table-fixed">
                                <colgroup>
                                  {Array.from({ length: field.cols || 2 }).map((_, i) => (
                                    <col key={i} style={{ width: field.colWidths?.[i] || 'auto' }} />
                                  ))}
                                </colgroup>
                                <thead>
                                  <tr className="bg-slate-50">
                                    {Array.from({ length: field.cols || 2 }).map((_, i) => (
                                      <th key={i} className="border border-slate-300 px-2 py-1 text-left text-xs font-medium text-slate-500 uppercase truncate">
                                        {field.options?.[i] || `Col ${i + 1}`}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {Array.from({ length: field.rows || 2 }).map((_, rowIndex) => (
                                    <tr key={rowIndex} style={{ height: field.rowHeights?.[rowIndex] || 'auto' }}>
                                      {Array.from({ length: field.cols || 2 }).map((_, colIndex) => (
                                        <td key={colIndex} className="border border-slate-300 px-2 py-1"></td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Rnd>
                ))}

                {template.fields?.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl pointer-events-none">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Plus className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-lg font-medium text-slate-500">Drag and drop elements here</p>
                    <p className="text-sm">Build your document template visually</p>
                  </div>
                )}
              </div>
            </Letterhead>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 z-10">
          <div className="p-4 border-b border-slate-100 font-semibold text-slate-700 flex items-center">
            <Settings className="w-4 h-4 mr-2" /> Properties
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            {selectedField ? (
              <div className="space-y-6">
                {selectedField.type === 'static-text' ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Text Content</label>
                    <textarea
                      value={selectedField.content || ''}
                      onChange={(e) => updateField(selectedField.id, { content: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 min-h-[200px]"
                      placeholder="Enter text here..."
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Field Label</label>
                      <input
                        type="text"
                        value={selectedField.label}
                        onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Variable Name</label>
                      <input
                        type="text"
                        value={selectedField.name}
                        onChange={(e) => updateField(selectedField.id, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-slate-500">Used for data export and API</p>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <input
                        type="checkbox"
                        id="required-toggle"
                        checked={selectedField.required}
                        onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <label htmlFor="required-toggle" className="text-sm font-medium text-slate-700 cursor-pointer">
                        Required Field
                      </label>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <label className="text-sm font-medium text-slate-700">Text Formatting</label>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateField(selectedField.id, { bold: !selectedField.bold })}
                          className={cn(
                            "p-2 border rounded-md transition-colors",
                            selectedField.bold ? "bg-indigo-100 border-indigo-300 text-indigo-700" : "bg-white border-slate-300 text-slate-600"
                          )}
                          title="Bold"
                        >
                          <span className="font-bold">B</span>
                        </button>
                        <div className="flex border border-slate-300 rounded-md overflow-hidden">
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <button
                              key={align}
                              onClick={() => updateField(selectedField.id, { align })}
                              className={cn(
                                "p-2 transition-colors border-r last:border-r-0",
                                selectedField.align === align || (!selectedField.align && align === 'left')
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-white text-slate-600"
                              )}
                              title={`Align ${align}`}
                            >
                              <div className={cn(
                                "w-4 h-0.5 bg-current mb-0.5 mx-auto",
                                align === 'left' ? "mr-auto ml-0" : align === 'right' ? "ml-auto mr-0" : "mx-auto"
                              )}></div>
                              <div className="w-3 h-0.5 bg-current mb-0.5 mx-auto"></div>
                              <div className={cn(
                                "w-4 h-0.5 bg-current mx-auto",
                                align === 'left' ? "mr-auto ml-0" : align === 'right' ? "ml-auto mr-0" : "mx-auto"
                              )}></div>
                            </button>
                          ))}
                        </div>
                        <input
                          type="color"
                          value={selectedField.color || '#000000'}
                          onChange={(e) => updateField(selectedField.id, { color: e.target.value })}
                          className="w-10 h-10 p-1 border border-slate-300 rounded-md cursor-pointer"
                          title="Text Color"
                        />
                      </div>
                    </div>

                    {selectedField.type === 'table' && (
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Rows</label>
                            <input
                              type="number"
                              min="1"
                              value={selectedField.rows || 2}
                              onChange={(e) => updateField(selectedField.id, { rows: parseInt(e.target.value) || 1 })}
                              className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Columns</label>
                            <input
                              type="number"
                              min="1"
                              value={selectedField.cols || 2}
                              onChange={(e) => updateField(selectedField.id, { cols: parseInt(e.target.value) || 1 })}
                              className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Column Headers (comma separated)</label>
                          <textarea
                            value={selectedField.options?.join(', ') || ''}
                            onChange={(e) => updateField(selectedField.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 h-16"
                            placeholder="Item, Quantity, Price"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Column Widths (comma separated)</label>
                          <input
                            type="text"
                            value={selectedField.colWidths?.join(', ') || ''}
                            onChange={(e) => updateField(selectedField.id, { colWidths: e.target.value.split(',').map(s => s.trim()) })}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g., 50px, 1fr, 20%"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Row Heights (comma separated)</label>
                          <input
                            type="text"
                            value={selectedField.rowHeights?.join(', ') || ''}
                            onChange={(e) => updateField(selectedField.id, { rowHeights: e.target.value.split(',').map(s => s.trim()) })}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g., 30px, 40px"
                          />
                        </div>
                      </div>
                    )}

                    {selectedField.type === 'image' && (
                      <div className="space-y-2 pt-4 border-t border-slate-100">
                        <label className="text-sm font-medium text-slate-700">Image URL</label>
                        <input
                          type="text"
                          value={selectedField.content || ''}
                          onChange={(e) => updateField(selectedField.id, { content: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          placeholder="https://example.com/logo.png"
                        />
                        <p className="text-xs text-slate-500">Enter a direct link to the image</p>
                      </div>
                    )}

                    {selectedField.type === 'dropdown' && (
                      <div className="space-y-2 pt-4 border-t border-slate-100">
                        <label className="text-sm font-medium text-slate-700">Options (comma separated)</label>
                        <textarea
                          value={selectedField.options?.join(', ') || ''}
                          onChange={(e) => updateField(selectedField.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 h-24"
                          placeholder="Option 1, Option 2"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-400 mt-12">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Select an element on the canvas to edit its properties.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
