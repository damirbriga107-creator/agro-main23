import React, { useState } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  EyeIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

// Import our enhanced components
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import Modal from '../ui/Modal';
import Form from '../ui/Form';
import VirtualizedList from '../ui/VirtualizedList';
import { CardSkeleton, TableSkeleton, ListSkeleton } from '../ui/SkeletonLoaders';
import { useConfirmationModal } from '../ui/Modal';

// Example data
const sampleCrops = [
  { id: '1', name: 'Corn', variety: 'Sweet Corn', area: 50, status: 'growing', revenue: 25000 },
  { id: '2', name: 'Wheat', variety: 'Winter Wheat', area: 75, status: 'planted', revenue: 18000 },
  { id: '3', name: 'Soybeans', variety: 'Roundup Ready', area: 60, status: 'harvested', revenue: 22000 },
  { id: '4', name: 'Tomatoes', variety: 'Roma', area: 25, status: 'growing', revenue: 35000 },
  { id: '5', name: 'Potatoes', variety: 'Russet', area: 40, status: 'harvested', revenue: 28000 },
];

const ComponentExamples: React.FC = () => {
  const [selectedCrop, setSelectedCrop] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { confirm, ConfirmationModal } = useConfirmationModal();

  const handleDelete = (crop: any) => {
    confirm({
      title: 'Delete Crop',
      description: `Are you sure you want to delete ${crop.name}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        console.log('Deleting crop:', crop);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    setIsFormModalOpen(false);
  };

  return (
    <div className="space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-neutral-900">Component Examples</h1>
        <p className="text-neutral-600">
          Demonstration of enhanced UI components with accessibility and performance optimizations
        </p>
      </div>

      {/* Button Examples */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-neutral-900">Enhanced Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary" size="sm">
            Primary Small
          </Button>
          <Button variant="secondary" size="md" leftIcon={PlusIcon}>
            Secondary with Icon
          </Button>
          <Button variant="earth" size="lg" rightIcon={EyeIcon}>
            Earth Theme Large
          </Button>
          <Button variant="sky" loading>
            Loading State
          </Button>
          <Button variant="danger" leftIcon={TrashIcon}>
            Danger Button
          </Button>
        </div>
      </section>

      {/* DataTable Example */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-neutral-900">Enhanced Data Table</h2>
        <DataTable.Root onRowClick={(crop) => setSelectedCrop(crop)}>
          <DataTable.Header>
            <DataTable.HeaderCell sortKey="name">Crop Name</DataTable.HeaderCell>
            <DataTable.HeaderCell sortKey="variety">Variety</DataTable.HeaderCell>
            <DataTable.HeaderCell sortKey="area" align="right">Area (acres)</DataTable.HeaderCell>
            <DataTable.HeaderCell sortKey="status">Status</DataTable.HeaderCell>
            <DataTable.HeaderCell sortKey="revenue" align="right">Revenue</DataTable.HeaderCell>
            <DataTable.HeaderCell align="center">Actions</DataTable.HeaderCell>
          </DataTable.Header>

          <DataTable.Body>
            {sampleCrops.map((crop) => (
              <DataTable.Row key={crop.id} data={crop}>
                <DataTable.Cell>
                  <div className="font-medium text-neutral-900">{crop.name}</div>
                </DataTable.Cell>
                <DataTable.Cell>{crop.variety}</DataTable.Cell>
                <DataTable.Cell align="right">{crop.area}</DataTable.Cell>
                <DataTable.Cell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    crop.status === 'harvested' ? 'bg-green-100 text-green-800' :
                    crop.status === 'growing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {crop.status}
                  </span>
                </DataTable.Cell>
                <DataTable.Cell align="right">
                  ${crop.revenue.toLocaleString()}
                </DataTable.Cell>
                <DataTable.Cell align="center">
                  <div className="flex items-center justify-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      leftIcon={PencilIcon}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCrop(crop);
                        setIsModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      leftIcon={TrashIcon}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(crop);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable.Body>
        </DataTable.Root>

        {selectedCrop && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Selected: {selectedCrop.name} - {selectedCrop.variety}
            </p>
          </div>
        )}
      </section>

      {/* Form Examples */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-neutral-900">Enhanced Forms</h2>
        <div className="max-w-2xl">
          <Form.Root onSubmit={handleSubmit}>
            <Form.Section title="Crop Information" description="Enter details about your crop">
              <div className="grid grid-cols-2 gap-4">
                <Form.Field required>
                  <Form.Label>Crop Name</Form.Label>
                  <Form.Input placeholder="Enter crop name" />
                  <Form.Help>Choose a descriptive name for your crop</Form.Help>
                </Form.Field>

                <Form.Field required>
                  <Form.Label>Variety</Form.Label>
                  <Form.Select placeholder="Select variety">
                    <option value="sweet">Sweet Corn</option>
                    <option value="field">Field Corn</option>
                    <option value="popcorn">Popcorn</option>
                  </Form.Select>
                </Form.Field>
              </div>

              <Form.Field required>
                <Form.Label>Area</Form.Label>
                <Form.Input type="number" placeholder="Enter area in acres" min="0" step="0.1" />
              </Form.Field>

              <Form.Field>
                <Form.Label>Status</Form.Label>
                <Form.RadioGroup
                  name="status"
                  options={[
                    { value: 'planted', label: 'Planted', description: 'Seeds have been planted' },
                    { value: 'growing', label: 'Growing', description: 'Crop is actively growing' },
                    { value: 'harvested', label: 'Harvested', description: 'Crop has been harvested' },
                  ]}
                  orientation="horizontal"
                />
              </Form.Field>

              <Form.Field>
                <Form.Label>Notes</Form.Label>
                <Form.Textarea placeholder="Additional notes about this crop" rows={3} />
              </Form.Field>

              <Form.Field>
                <Form.Checkbox 
                  label="Certified Organic"
                  description="This crop is certified organic"
                />
              </Form.Field>
            </Form.Section>

            <div className="flex justify-end space-x-3">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Save Crop
              </Button>
            </div>
          </Form.Root>
        </div>
      </section>

      {/* VirtualizedList Example */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-neutral-900">Virtualized List</h2>
        <div className="max-w-2xl">
          <VirtualizedList
            items={Array.from({ length: 1000 }, (_, i) => ({
              id: i,
              name: `Crop ${i + 1}`,
              area: Math.floor(Math.random() * 100) + 10,
              status: ['planted', 'growing', 'harvested'][Math.floor(Math.random() * 3)],
            }))}
            itemHeight={80}
            containerHeight={400}
            renderItem={(item, index) => (
              <div className="p-4 border-b border-neutral-200 hover:bg-neutral-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-neutral-900">{item.name}</h4>
                    <p className="text-sm text-neutral-500">{item.area} acres • {item.status}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </div>
              </div>
            )}
            keyExtractor={(item, index) => `crop-${item.id}`}
            className="border border-neutral-200 rounded-xl"
          />
        </div>
      </section>

      {/* Loading States */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-neutral-900">Loading States</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CardSkeleton hasAvatar hasImage hasActions />
          <TableSkeleton rows={3} columns={3} />
          <ListSkeleton items={4} hasAvatar hasMetadata />
        </div>
      </section>

      {/* Action Buttons */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-neutral-900">Interactive Examples</h2>
        <div className="flex space-x-4">
          <Button onClick={() => setIsModalOpen(true)}>
            Open Modal
          </Button>
          <Button variant="secondary" onClick={() => setIsFormModalOpen(true)}>
            Form Modal
          </Button>
        </div>
      </section>

      {/* Example Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crop Details"
        description="View and edit crop information"
        size="lg"
      >
        <Modal.Body>
          {selectedCrop ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Crop Name
                  </label>
                  <p className="text-lg font-semibold">{selectedCrop.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Variety
                  </label>
                  <p className="text-lg">{selectedCrop.variety}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Area
                  </label>
                  <p className="text-lg">{selectedCrop.area} acres</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Revenue
                  </label>
                  <p className="text-lg font-semibold text-green-600">
                    ${selectedCrop.revenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p>No crop selected</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>
          <Button leftIcon={PencilIcon}>
            Edit Crop
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title="Add New Crop"
        size="md"
      >
        <Form.Root onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Section>
              <Form.Field required>
                <Form.Label>Crop Name</Form.Label>
                <Form.Input placeholder="Enter crop name" />
              </Form.Field>

              <Form.Field required>
                <Form.Label>Area (acres)</Form.Label>
                <Form.Input type="number" placeholder="Enter area" min="0" step="0.1" />
              </Form.Field>

              <Form.Field>
                <Form.Label>Notes</Form.Label>
                <Form.Textarea placeholder="Additional notes" />
              </Form.Field>
            </Form.Section>
          </Modal.Body>

          <Modal.Footer>
            <Button 
              variant="secondary" 
              type="button"
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Add Crop
            </Button>
          </Modal.Footer>
        </Form.Root>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmationModal />
    </div>
  );
};

export default ComponentExamples;