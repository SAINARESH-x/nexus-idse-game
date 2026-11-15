// Normalisation tests for the Type Trap free-text answers.
import { describe, expect, it } from 'vitest'
import { checkTypeAnswer, L01_TYPE_TRAP, normalizeTypeAnswer } from '../typeTrap'

const question = (id: string) => L01_TYPE_TRAP.find((item) => item.id === id)!

describe('Type Trap answer matching', () => {
  it('accepts a string result with or without quotes', () => {
    expect(checkTypeAnswer(question('trap-1'), '55')).toBe(true)
    expect(checkTypeAnswer(question('trap-1'), "'55'")).toBe(true)
    expect(checkTypeAnswer(question('trap-1'), ' 10 ')).toBe(false)
  })

  it('normalises error names and extra detail', () => {
    expect(normalizeTypeAnswer('TypeError')).toBe('typeerror')
    expect(normalizeTypeAnswer('TypeError: unsupported operand')).toBe('typeerror')
    expect(normalizeTypeAnswer('Value Error')).toBe('valueerror')
    expect(checkTypeAnswer(question('trap-2'), 'type error')).toBe(true)
    expect(checkTypeAnswer(question('trap-3'), 'ValueError')).toBe(true)
  })

  it('treats booleans and numbers precisely', () => {
    expect(checkTypeAnswer(question('trap-4'), 'True')).toBe(true)
    expect(checkTypeAnswer(question('trap-4'), 'False')).toBe(false)
    expect(checkTypeAnswer(question('trap-5'), '3')).toBe(true)
    expect(checkTypeAnswer(question('trap-5'), '3.5')).toBe(false)
  })
})
