import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Trash2, Printer, AlertTriangle, CheckCircle, Loader2, UserMinus, UserPlus } from 'lucide-react';
import { db } from '../services/mockDatabase';
import { Device, DeviceStatus, Role, DeviceLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { QRCodeWrapper } from '../components/QRCodeWrapper';
import { v4 as uuidv4 } from 'uuid';

export const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    const init = async () => {
        const isNew = id === 'new';
        const isEditMode = searchParams.get('edit') === 'true';
        const isQRMode = searchParams.get('qr') === 'true';

        if (isNew) {
            setIsEditing(true);
            setDevice({
                id: uuidv4(),
                name: '',
                code: `EQ-${Math.floor(Math.random() * 10000)}`,
                category: 'Điện tử',
                status: DeviceStatus.AVAILABLE,
                location: '',
                purchaseDate: new Date().toISOString().split('T')[0],
                history: [],
                imageUrl: 'https://picsum.photos/200/200'
            });
            setLoading(false);
        } else {
            const found = await db.getDeviceById(id || '');
            if (found) {
                setDevice(found);
                setIsEditing(isEditMode);
                setShowQR(isQRMode);
            } else {
                navigate('/devices');
            }
            setLoading(false);
        }
    };
    init();
  }, [id, searchParams, navigate]);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<Device>();

  useEffect(() => {
    if (device) {
      setValue('name', device.name);
      setValue('code', device.code);
      setValue('category', device.category);
      setValue('status', device.status);
      setValue('location', device.location);
      setValue('purchaseDate', device.purchaseDate);
      setValue('description', device.description);
    }
  }, [device, setValue]);

  const onSubmit = async (data: Device) => {
    if (!device || !user) return;
    setSaving(true);

    try {
        const changes: DeviceLog = {
            id: uuidv4(),
            date: new Date().toISOString(),
            action: id === 'new' ? 'TẠO MỚI' : 'CẬP NHẬT',
            performedBy: user.fullName,
            notes: `Trạng thái: ${data.status}`
        };

        const updatedDevice: Device = {
            ...device,
            ...data,
            history: [changes, ...device.history]
        };

        await db.saveDevice(updatedDevice);
        setDevice(updatedDevice);
        setIsEditing(false);
        alert('Lưu thành công!');
        if (id === 'new') navigate(`/devices/${updatedDevice.id}`);
    } catch (e) {
        alert('Lỗi khi lưu thiết bị');
    } finally {
        setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: DeviceStatus, actionNote: string) => {
    if (!device || !user) return;
    setSaving(true);
    
    try {
        const log: DeviceLog = {
            id: uuidv4(),
            date: new Date().toISOString(),
            action: actionNote.toUpperCase(),
            performedBy: user.fullName,
            notes: `Chuyển trạng thái sang ${newStatus}`
        };

        const updated = { 
            ...device, 
            status: newStatus,
            history: [log, ...device.history]
        };
        
        await db.saveDevice(updated);
        setDevice(updated);
    } catch (e) {
        alert("Lỗi khi cập nhật trạng thái");
    } finally {
        setSaving(false);
    }
  };

  // --- CHECK-IN / CHECK-OUT LOGIC ---
  const handleBorrow = async () => {
    if (!device || !user) return;
    if (device.status !== DeviceStatus.AVAILABLE) {
        alert("Thiết bị không sẵn sàng để mượn.");
        return;
    }
    setSaving(true);
    try {
        const log: DeviceLog = {
            id: uuidv4(),
            date: new Date().toISOString(),
            action: 'MƯỢN THIẾT BỊ',
            performedBy: user.fullName,
            notes: `Người mượn: ${user.fullName} (${user.username})`
        };

        const updated: Device = {
            ...device,
            status: DeviceStatus.IN_USE,
            assignedTo: user.id,
            history: [log, ...device.history]
        };
        await db.saveDevice(updated);
        setDevice(updated);
    } catch(e) {
        alert("Lỗi khi đăng ký mượn.");
    } finally {
        setSaving(false);
    }
  };

  const handleReturn = async () => {
    if (!device || !user) return;
    setSaving(true);
    try {
        const log: DeviceLog = {
            id: uuidv4(),
            date: new Date().toISOString(),
            action: 'TRẢ THIẾT BỊ',
            performedBy: user.fullName,
            notes: `Đã trả lại kho.`
        };

        const updated: Device = {
            ...device,
            status: DeviceStatus.AVAILABLE,
            assignedTo: undefined,
            history: [log, ...device.history]
        };
        await db.saveDevice(updated);
        setDevice(updated);
    } catch(e) {
        alert("Lỗi khi trả thiết bị.");
    } finally {
        setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Bạn có chắc chắn muốn xóa thiết bị này? Hành động này không thể hoàn tác.')) {
      if (device) {
          setSaving(true);
          await db.deleteDevice(device.id);
          navigate('/devices');
      }
    }
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && device) {
      printWindow.document.write(`
        <html>
          <head><title>In mã QR - ${device.code}</title></head>
          <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
            <h1>${device.name}</h1>
            <p>${device.code}</p>
            <div id="qr-target"></div>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
            <script>
              new QRCode(document.getElementById("qr-target"), {
                text: "${window.location.origin}/#/devices/${device.id}",
                width: 256,
                height: 256
              });
              setTimeout(() => window.print(), 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const canEdit = user?.role === Role.ADMIN || user?.role === Role.MANAGER;
  const canDelete = user?.role === Role.ADMIN;
  // User can return if they are the one assigned OR if they are an admin/manager
  const canReturn = device?.assignedTo === user?.id || user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600"/></div>;
  if (!device) return <div>Không tìm thấy thiết bị.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/devices')}
          className="flex items-center text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
        </button>
        
        <div className="flex items-center space-x-3">
          {!isEditing && (
             <button 
               onClick={() => setShowQR(!showQR)}
               className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
             >
               <Printer className="w-4 h-4 mr-2" /> {showQR ? 'Ẩn QR' : 'Hiện QR'}
             </button>
          )}
          {!isEditing && canEdit && (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Sửa thông tin
            </button>
          )}
          {!isEditing && canDelete && (
            <button 
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* QR Code Section */}
      {showQR && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 flex flex-col items-center justify-center animate-fade-in">
          <h3 className="text-lg font-bold mb-4">Quét để quản lý thiết bị</h3>
          <QRCodeWrapper value={`${window.location.origin}/#/devices/${device.id}`} size={200} />
          <p className="mt-4 text-sm text-gray-500">Mã: {device.code}</p>
          <button 
            onClick={printQR}
            className="mt-4 text-blue-600 hover:underline text-sm"
          >
            In nhãn dán
          </button>
        </div>
      )}

      {/* Main Content Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
        {saving && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
            </div>
        )}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Quick Actions Bar */}
          {!isEditing && (
            <div className="flex flex-wrap gap-3 pb-6 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-500 w-full mb-1">Tác vụ nhanh:</span>
              
              {/* Borrow / Return Logic */}
              {device.status === DeviceStatus.AVAILABLE && (
                  <button
                    type="button"
                    onClick={handleBorrow}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors"
                  >
                    <UserPlus className="w-4 h-4 mr-2" /> Đăng ký Mượn
                  </button>
              )}

              {device.status === DeviceStatus.IN_USE && canReturn && (
                  <button
                    type="button"
                    onClick={handleReturn}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 transition-colors"
                  >
                    <UserMinus className="w-4 h-4 mr-2" /> Trả thiết bị
                  </button>
              )}

              <button 
                type="button"
                onClick={() => handleStatusChange(DeviceStatus.BROKEN, "BÁO HỎNG")}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 mr-2" /> Báo hỏng / Mất
              </button>
              
              {(canEdit) && device.status === DeviceStatus.BROKEN && (
                <button 
                  type="button"
                  onClick={() => handleStatusChange(DeviceStatus.MAINTENANCE, "GỬI BẢO TRÌ")}
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors"
                >
                   Gửi bảo trì
                </button>
              )}
               {(canEdit) && (device.status === DeviceStatus.MAINTENANCE || device.status === DeviceStatus.BROKEN) && (
                <button 
                  type="button"
                  onClick={() => handleStatusChange(DeviceStatus.AVAILABLE, "HOÀN THÀNH SỬA CHỮA")}
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 transition-colors"
                >
                   <CheckCircle className="w-4 h-4 mr-2" /> Đã sửa xong / Sẵn sàng
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên thiết bị</label>
              <input 
                {...register('name', { required: true })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
              />
              {errors.name && <span className="text-red-500 text-xs">Bắt buộc</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã tài sản</label>
              <input 
                {...register('code', { required: true })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
              <select 
                {...register('category')}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="Điện tử">Điện tử</option>
                <option value="Nội thất">Nội thất</option>
                <option value="Thí nghiệm">Thí nghiệm</option>
                <option value="CNTT">Công nghệ thông tin</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select 
                {...register('status')}
                disabled={!isEditing && !canEdit}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
              >
                 <option value={DeviceStatus.AVAILABLE}>Sẵn sàng</option>
                 <option value={DeviceStatus.IN_USE}>Đang sử dụng</option>
                 <option value={DeviceStatus.BROKEN}>Hỏng / Mất</option>
                 <option value={DeviceStatus.MAINTENANCE}>Bảo trì</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí lưu trữ</label>
              <input 
                {...register('location')}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày mua</label>
              <input 
                type="date"
                {...register('purchaseDate')}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả / Cấu hình</label>
             <textarea 
                {...register('description')}
                disabled={!isEditing}
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
             />
          </div>

          {isEditing && (
            <div className="flex justify-end pt-4">
              <button 
                type="button"
                onClick={() => {
                  if (id === 'new') navigate('/devices');
                  else setIsEditing(false);
                }}
                className="mr-3 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit"
                disabled={saving}
                className="flex items-center px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
              >
                <Save className="w-4 h-4 mr-2" /> Lưu thay đổi
              </button>
            </div>
          )}
        </div>
      </form>

      {/* History Log */}
      {!isEditing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lịch sử hoạt động</h3>
          <div className="flow-root">
            <ul className="-mb-8">
              {device.history.map((log, idx) => (
                <li key={log.id}>
                  <div className="relative pb-8">
                    {idx !== device.history.length - 1 && (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                          <span className="text-white text-xs font-bold">{log.performedBy.charAt(0).toUpperCase()}</span>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            {log.action} <span className="font-medium text-gray-900">bởi {log.performedBy}</span>
                          </p>
                          {log.notes && <p className="text-sm text-gray-500 mt-1 italic">"{log.notes}"</p>}
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {device.history.length === 0 && (
                <p className="text-gray-500 italic text-sm">Chưa có lịch sử.</p>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};