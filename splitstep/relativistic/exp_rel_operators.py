#!/usr/bin/python3
"""
Exponentiating the momentum and mass terms found in the
Dirac equation. The form of these momentum terms are
found on page 565 of 
Principles of Quantum Mechanics by Ramamurti Shankar.
"""
from sympy import Matrix, Symbol, exp, conjugate, gcd
from sympy.physics.quantum.dagger import Dagger
import numpy as np


SIGMA_X = np.array([[0.0, 1.0], 
                    [1.0, 0.0]], dtype=np.complex128)
SIGMA_Y = np.array([[0.0, -1.0j], 
                    [1.0j, 0.0]], dtype=np.complex128)
SIGMA_Z = np.array([[1.0, 0.0], 
                    [0.0, -1.0]], dtype=np.complex128)
I = np.identity(2, dtype=np.complex128)

ALPHA_X = np.kron(np.array([[0.0, 1.0], [1.0, 0.0]]), SIGMA_X)
ALPHA_Y = np.kron(np.array([[0.0, 1.0], [1.0, 0.0]]), SIGMA_Y)
ALPHA_Z = np.kron(np.array([[0.0, 1.0], [1.0, 0.0]]), SIGMA_Z)
BETA = np.kron(np.array([[1.0, 0.0], [0.0, -1.0]]), I)


# Check if the matrices follow the anticommutation rules.
for i, m1 in enumerate((ALPHA_X, ALPHA_Y, ALPHA_Z, BETA)):
    for j, m2 in enumerate((ALPHA_X, ALPHA_Y, ALPHA_Z, BETA)):
        print(i+1, j+1, '\n', np.matmul(m1, m2) + np.matmul(m2, m1))

# Print each of the matrices individually.
# print(ALPHA_X)
# print(ALPHA_Y)
# print(ALPHA_Z)
# print(BETA)

dt = Symbol('dt')
px, py, pz = Symbol('px'), Symbol('py'), Symbol('pz')
mc2 = Symbol('mc2')

# print(exp(-0.5j*px*dt*Matrix(ALPHA_X)).simplify())
# print(exp(-0.5j*py*dt*Matrix(ALPHA_Y)).simplify())
# print(exp(-0.5j*pz*dt*Matrix(ALPHA_Z)).simplify())
# print(exp(-0.5j*m*dt*Matrix(BETA)).simplify())

beta_mc2 = mc2*Matrix(BETA)
p_dot_alpha = px*Matrix(ALPHA_X) + py*Matrix(ALPHA_Y) + pz*Matrix(ALPHA_Z)
p2 = px**2 + py**2 + pz**2
dirac_matrix = p_dot_alpha + beta_mc2

exp_kinetic = exp(-0.5j*(dirac_matrix)*dt
                  ).simplify().subs(p2, 'p2')
for i in range(4):
    for j in range(4):
        print('exp_kinetic[%d][%d] = ' % (i, j), exp_kinetic[4*i+j])


