import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from '../../../lib/db';
import User from '../../../models/User';
import Org from '../../../models/Org';
import { verifyPassword } from '../../../lib/crypto';

export default NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        await connectToDatabase();
        const user = await User.findOne({ email: credentials.email });
        if (!user) return null;
        const ok = await verifyPassword(credentials.password, user.passwordHash);
        if (!ok) return null;
        if (user.isDisabled) return null;
        if (user.orgId) {
          const org = await Org.findById(user.orgId);
          if (org?.isDisabled) return null;
        }
        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.orgId ? String(user.orgId) : null,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.orgId = user.orgId || null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      session.user.orgId = token.orgId;
      return session;
    }
  },
});

