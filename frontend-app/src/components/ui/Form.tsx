import React, { createContext, useContext, useId, forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { clsx, componentVariants } from '../../lib/design-system';
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

// Form Context
interface FormFieldContextValue {
  id: string;
  hasError: boolean;
  isRequired: boolean;
  isDisabled: boolean;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

const useFormField = () => {
  const context = useContext(FormFieldContext);
  if (!context) {
    throw new Error('Form field components must be used within Form.Field');
  }
  return context;
};

// Form Root Component
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

const FormRoot: React.FC<FormProps> = ({ children, className, ...props }) => {
  return (
    <form className={clsx('space-y-6', className)} {...props}>
      {children}
    </form>
  );
};

// Form Field Container
interface FormFieldProps {
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  children,
  error,
  required = false,
  disabled = false,
  className,
}) => {
  const id = useId();
  const hasError = Boolean(error);

  const contextValue: FormFieldContextValue = {
    id,
    hasError,
    isRequired: required,
    isDisabled: disabled,
  };

  return (
    <FormFieldContext.Provider value={contextValue}>
      <div className={clsx('space-y-2', className)}>
        {children}
      </div>
    </FormFieldContext.Provider>
  );
};

// Form Label
interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  optional?: boolean;
}

const FormLabel: React.FC<FormLabelProps> = ({ 
  children, 
  className, 
  optional = false,
  ...props 
}) => {
  const { id, isRequired } = useFormField();

  return (
    <label
      htmlFor={id}
      className={clsx(
        'block text-sm font-medium text-neutral-700',
        className
      )}
      {...props}
    >
      {children}
      {isRequired && (
        <span className="ml-1 text-red-500" aria-label="required">
          *
        </span>
      )}
      {optional && !isRequired && (
        <span className="ml-1 text-neutral-500 text-xs">
          (optional)
        </span>
      )}
    </label>
  );
};

// Form Input
interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: keyof typeof componentVariants.input.sizes;
  variant?: keyof typeof componentVariants.input.variants;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, size = 'md', variant, ...props }, ref) => {
    const { id, hasError, isRequired, isDisabled } = useFormField();
    
    const inputVariant = hasError ? 'error' : variant || 'default';
    const baseClasses = componentVariants.input.base;
    const sizeClasses = componentVariants.input.sizes[size];
    const variantClasses = componentVariants.input.variants[inputVariant];

    return (
      <input
        ref={ref}
        id={id}
        className={clsx(
          baseClasses,
          sizeClasses,
          variantClasses,
          isDisabled && 'opacity-60 cursor-not-allowed',
          className
        )}
        required={isRequired}
        disabled={isDisabled || props.disabled}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${id}-error` : undefined}
        {...props}
      />
    );
  }
);

FormInput.displayName = 'FormInput';

// Form Textarea
interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: keyof typeof componentVariants.input.sizes;
  variant?: keyof typeof componentVariants.input.variants;
}

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, size = 'md', variant, rows = 4, ...props }, ref) => {
    const { id, hasError, isRequired, isDisabled } = useFormField();
    
    const inputVariant = hasError ? 'error' : variant || 'default';
    const baseClasses = componentVariants.input.base;
    const sizeClasses = componentVariants.input.sizes[size];
    const variantClasses = componentVariants.input.variants[inputVariant];

    return (
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={clsx(
          baseClasses,
          sizeClasses,
          variantClasses,
          'resize-vertical',
          isDisabled && 'opacity-60 cursor-not-allowed',
          className
        )}
        required={isRequired}
        disabled={isDisabled || props.disabled}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${id}-error` : undefined}
        {...props}
      />
    );
  }
);

FormTextarea.displayName = 'FormTextarea';

// Form Select
interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: keyof typeof componentVariants.input.sizes;
  variant?: keyof typeof componentVariants.input.variants;
  placeholder?: string;
}

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className, size = 'md', variant, children, placeholder, ...props }, ref) => {
    const { id, hasError, isRequired, isDisabled } = useFormField();
    
    const inputVariant = hasError ? 'error' : variant || 'default';
    const baseClasses = componentVariants.input.base;
    const sizeClasses = componentVariants.input.sizes[size];
    const variantClasses = componentVariants.input.variants[inputVariant];

    return (
      <select
        ref={ref}
        id={id}
        className={clsx(
          baseClasses,
          sizeClasses,
          variantClasses,
          'appearance-none bg-no-repeat bg-right bg-[length:16px] pr-10',
          'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%23666\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")]',
          isDisabled && 'opacity-60 cursor-not-allowed',
          className
        )}
        required={isRequired}
        disabled={isDisabled || props.disabled}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${id}-error` : undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
    );
  }
);

FormSelect.displayName = 'FormSelect';

// Form Checkbox
interface FormCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ className, label, description, ...props }, ref) => {
    const { id, hasError, isRequired, isDisabled } = useFormField();

    return (
      <div className="flex items-start space-x-3">
        <input
          ref={ref}
          type="checkbox"
          id={id}
          className={clsx(
            'h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0',
            hasError && 'border-red-500',
            isDisabled && 'opacity-60 cursor-not-allowed',
            className
          )}
          required={isRequired}
          disabled={isDisabled || props.disabled}
          aria-invalid={hasError}
          aria-describedby={
            hasError 
              ? `${id}-error` 
              : description 
                ? `${id}-description` 
                : undefined
          }
          {...props}
        />
        <div className="flex flex-col">
          {label && (
            <label
              htmlFor={id}
              className={clsx(
                'text-sm font-medium text-neutral-700',
                isDisabled && 'opacity-60'
              )}
            >
              {label}
              {isRequired && (
                <span className="ml-1 text-red-500" aria-label="required">
                  *
                </span>
              )}
            </label>
          )}
          {description && (
            <p
              id={`${id}-description`}
              className={clsx(
                'text-xs text-neutral-500 mt-1',
                isDisabled && 'opacity-60'
              )}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';

// Form Radio Group
interface FormRadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface FormRadioGroupProps {
  name: string;
  options: FormRadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const FormRadioGroup: React.FC<FormRadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  orientation = 'vertical',
  className,
}) => {
  const { id, hasError, isRequired, isDisabled } = useFormField();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <fieldset
      className={className}
      aria-describedby={hasError ? `${id}-error` : undefined}
      aria-invalid={hasError}
    >
      <div
        className={clsx(
          'space-y-3',
          orientation === 'horizontal' && 'flex space-x-6 space-y-0'
        )}
      >
        {options.map((option, index) => {
          const optionId = `${id}-option-${index}`;
          const isOptionDisabled = isDisabled || option.disabled;

          return (
            <div key={option.value} className="flex items-start space-x-3">
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={handleChange}
                required={isRequired && index === 0}
                disabled={isOptionDisabled}
                className={clsx(
                  'h-4 w-4 border-neutral-300 text-primary-600 focus:ring-primary-500',
                  hasError && 'border-red-500',
                  isOptionDisabled && 'opacity-60 cursor-not-allowed'
                )}
                aria-describedby={option.description ? `${optionId}-description` : undefined}
              />
              <div className="flex flex-col">
                <label
                  htmlFor={optionId}
                  className={clsx(
                    'text-sm font-medium text-neutral-700',
                    isOptionDisabled && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {option.label}
                </label>
                {option.description && (
                  <p
                    id={`${optionId}-description`}
                    className={clsx(
                      'text-xs text-neutral-500 mt-1',
                      isOptionDisabled && 'opacity-60'
                    )}
                  >
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
};

// Form Error Message
interface FormErrorProps {
  children: React.ReactNode;
  className?: string;
}

const FormError: React.FC<FormErrorProps> = ({ children, className }) => {
  const { id, hasError } = useFormField();

  if (!hasError) return null;

  return (
    <div
      id={`${id}-error`}
      className={clsx(
        'flex items-center space-x-2 text-sm text-red-600',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
};

// Form Success Message
interface FormSuccessProps {
  children: React.ReactNode;
  className?: string;
}

const FormSuccess: React.FC<FormSuccessProps> = ({ children, className }) => {
  const { id } = useFormField();

  return (
    <div
      id={`${id}-success`}
      className={clsx(
        'flex items-center space-x-2 text-sm text-green-600',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
};

// Form Help Text
interface FormHelpProps {
  children: React.ReactNode;
  className?: string;
}

const FormHelp: React.FC<FormHelpProps> = ({ children, className }) => {
  const { id } = useFormField();

  return (
    <div
      id={`${id}-help`}
      className={clsx(
        'flex items-start space-x-2 text-sm text-neutral-500',
        className
      )}
    >
      <InformationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
};

// Form Section
interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className,
}) => {
  return (
    <div className={clsx('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-medium text-neutral-900">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-neutral-500">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

// Export compound component
const Form = {
  Root: FormRoot,
  Field: FormField,
  Label: FormLabel,
  Input: FormInput,
  Textarea: FormTextarea,
  Select: FormSelect,
  Checkbox: FormCheckbox,
  RadioGroup: FormRadioGroup,
  Error: FormError,
  Success: FormSuccess,
  Help: FormHelp,
  Section: FormSection,
};

export default Form;