import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, Edit, Trash2, FileText, Building } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '../utils/cn';

export function Templates() {
  const { templates, deleteTemplate } = useStore();
  const { isAdmin } = useAuthStore();
  const { settings } = useSettingsStore();
  const navigate = useNavigate();
  const [departmentFilter, setFilter] = useState('All');

  if (!isAdmin) {
    return <div className="p-6 text-red-500">Access Denied. Admin only.</div>;
  }

  const depts = settings?.departments || ['General', 'HR', 'Finance', 'Operation', 'Public'];

  const filteredTemplates = departmentFilter === 'All'
    ? templates
    : templates.filter(t => t.department === departmentFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Document Templates</h1>
          <p className="text-slate-500">Manage and create dynamic document templates.</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={departmentFilter}
            onChange={(e) => setFilter(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white min-w-[140px]"
          >
            <option value="All">All Departments</option>
            {depts.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          
          <Button onClick={() => navigate('/templates/new')} className="flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">Prefix: {template.prefix}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 line-clamp-2 mb-4 h-10">
                {template.description}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                <span className="flex items-center"><Building className="w-3 h-3 mr-1"/> {template.department || 'General'}</span>
                <span>Document</span>
              </div>
              <div className="flex items-center space-x-2 pt-4 border-t border-slate-100">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1" 
                  onClick={() => navigate(`/templates/${template.id}`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => deleteTemplate(template.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
