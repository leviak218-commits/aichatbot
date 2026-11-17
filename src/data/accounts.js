const accounts = [
  { username: 'farmer', password: 'farmer123', name: 'Farmer', role: 'user' },
  { username: 'admin', password: 'admin123', name: 'Village Admin', role: 'admin' },
];

export const findAccount = (username, password) => accounts.find((account) => account.username === username && account.password === password);
export const usernameExists = (username) => accounts.some((account) => account.username === username);
export const createAccount = (account) => {
  const newAccount = { ...account, role: 'user' };
  accounts.push(newAccount);
  return newAccount;
};