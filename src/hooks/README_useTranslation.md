# useTranslation Hook

Custom hook để đơn giản hóa việc sử dụng đa ngôn ngữ trong các React Native components.

## Cách sử dụng

### 1. Import hook
```typescript
import { useTranslation } from '../hooks/useTranslation';
```

### 2. Sử dụng trong component
```typescript
const MyScreen: React.FC = () => {
  // Initialize hook
  const { t, useLanguageListener, isLoading } = useTranslation();
  
  // Define translation keys cần thiết cho screen này
  useLanguageListener(['header.my_screen', 'button.save', 'message.welcome']);

  return (
    <View>
      <Text>{t('header.my_screen', 'My Screen')}</Text>
      <Text>{t('button.save', 'Save')}</Text>
      <Text>{t('message.welcome', 'Welcome!')}</Text>
    </View>
  );
};
```

## API

### `t(key: string, fallback?: string): string`
- **key**: Translation key từ file Translations.js
- **fallback**: Text hiển thị nếu không tìm thấy translation
- **Returns**: Translated text hoặc fallback

### `useLanguageListener(keys: string[]): void`
- **keys**: Array các translation keys cần load cho component
- Tự động load translations khi component mount
- Tự động re-load khi user thay đổi ngôn ngữ

### `translate(key: string, fallback?: string): Promise<string>`
- Async version của `t()` function
- Sử dụng khi cần load translation động

### `isLoading: boolean`
- Trạng thái loading của translations
- `true` khi đang load, `false` khi hoàn thành

### `updateTranslations(keys: string[]): Promise<void>`
- Manually update translations cho các keys cụ thể
- Thường không cần sử dụng trực tiếp

## Examples

### Basic Usage
```typescript
const HeaderComponent = () => {
  const { t, useLanguageListener } = useTranslation();
  
  useLanguageListener(['header.title', 'header.subtitle']);
  
  return (
    <View>
      <Text style={styles.title}>{t('header.title', 'Default Title')}</Text>
      <Text style={styles.subtitle}>{t('header.subtitle', 'Default Subtitle')}</Text>
    </View>
  );
};
```

### With Loading State
```typescript
const ScreenWithLoading = () => {
  const { t, useLanguageListener, isLoading } = useTranslation();
  
  useLanguageListener(['screen.title', 'screen.content']);
  
  if (isLoading) {
    return <ActivityIndicator />;
  }
  
  return (
    <View>
      <Text>{t('screen.title', 'Loading...')}</Text>
      <Text>{t('screen.content', 'Loading content...')}</Text>
    </View>
  );
};
```

### Dynamic Translation Loading
```typescript
const DynamicScreen = () => {
  const { t, translate, useLanguageListener } = useTranslation();
  const [dynamicText, setDynamicText] = useState('');
  
  useLanguageListener(['screen.title']);
  
  const loadDynamicContent = async () => {
    const text = await translate('dynamic.content', 'Default content');
    setDynamicText(text);
  };
  
  useEffect(() => {
    loadDynamicContent();
  }, []);
  
  return (
    <View>
      <Text>{t('screen.title', 'Title')}</Text>
      <Text>{dynamicText}</Text>
    </View>
  );
};
```

## Best Practices

1. **Group Translation Keys**: Sử dụng prefix để group các keys
   ```
   'header.title', 'header.subtitle'
   'button.save', 'button.cancel'
   'message.success', 'message.error'
   ```

2. **Always Provide Fallback**: Luôn cung cấp fallback text
   ```typescript
   t('key.not.found', 'Fallback Text')
   ```

3. **Minimize Keys**: Chỉ load những translation keys thực sự cần thiết cho component
   ```typescript
   useLanguageListener(['header.title']); // Good
   useLanguageListener([...allKeys]); // Avoid
   ```

4. **Use Meaningful Fallbacks**: Fallback text nên có nghĩa và hữu ích
   ```typescript
   t('header.title', 'Page Title') // Good
   t('header.title', 'N/A') // Not helpful
   ```

## Performance Notes

- Hook sử dụng `useCallback` và `useState` để optimize re-renders
- Translations được cache trong component state
- Language change listeners được cleanup tự động khi component unmount
- Multiple components có thể sử dụng hook này mà không ảnh hưởng performance