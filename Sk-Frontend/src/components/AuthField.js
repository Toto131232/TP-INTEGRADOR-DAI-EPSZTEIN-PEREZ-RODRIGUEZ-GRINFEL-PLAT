import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme';

// Campo de formulario de login / registro: label + input + texto de ayuda.
// helperTone: 'muted' (gris) | 'success' (verde) | 'error' (rojo, también pinta el borde)
const AuthField = forwardRef(function AuthField(
  { label, helper, helperTone = 'muted', style, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const isError = helperTone === 'error';

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.accent}
        autoCapitalize="none"
        autoCorrect={false}
        {...inputProps}
        onFocus={(e) => {
          setFocused(true);
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          inputProps.onBlur?.(e);
        }}
        style={[
          styles.input,
          focused && styles.inputFocused,
          isError && styles.inputError,
        ]}
      />
      {helper ? (
        <Text style={[styles.helper, helperStyles[helperTone]]}>{helper}</Text>
      ) : null}
    </View>
  );
});

export default AuthField;

const helperStyles = StyleSheet.create({
  muted: { color: colors.textMuted },
  success: { color: colors.success },
  error: { color: colors.dangerText },
});

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBg,
    color: colors.text,
    fontSize: 15,
    outlineStyle: 'none', // web: saca el borde azul del navegador
  },
  inputFocused: { borderColor: colors.accent },
  inputError: { borderColor: colors.dangerText },
  helper: { fontSize: 12, marginTop: 6 },
});
