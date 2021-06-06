from .. import SplitStepMethod
import numpy as np
from typing import Tuple, Union, List, Dict
from .exp_matrices import get_exp_p, get_exp_vector_potential

class DiracSplitStepMethod(SplitStepMethod):
    """
    The dirac splitstep method. Unlike with the other classes that use metric units,
    the default units used are Hartree atomic units.

    References:

    Shankar R. (1994). The Dirac Equation. In Principles of Quantum Mechanics,
    chapter 20. Plenum Press.

    https://en.wikipedia.org/wiki/Dirac_equation

    Hartree units:

    https://en.wikipedia.org/wiki/Hartree_atomic_units

    """

    def __init__(self, potential: np.ndarray,
                 dimensions: Tuple[float, ...],
                 timestep: Union[float, np.complex128] = 1.0,
                 m: float = 1.0,
                 vector_potential: List[np.ndarray] = None,
                 units: Dict[str, float] = None):
        self._exp_p = None
        self._exp_V = None
        self._m = m
        self._vector_potential = vector_potential
        self.C = units['c'] if units and 'c' in units.keys() else 137.036
        self.HBAR = (units['hbar'] if units and 'hbar' 
                        in units.keys() else 1.0)
        SplitStepMethod.__init__(self, potential, dimensions, timestep)

    def set_timestep(self, timestep: Union[float, np.complex128]) -> None:
        p_list = []
        for i, d in enumerate(self.V.shape):
            freq = np.pi*np.fft.fftfreq(d)
            freq[0] = 1e-17
            p_list.append(np.complex128(2.0)*freq*d/self._dim[i])
        p = np.meshgrid(*p_list)
        self._dt = timestep
        dt = np.complex128(self._dt)
        m = np.complex128(self._m)
        self._exp_p = get_exp_p(dt, p, m, c=self.C, hbar=self.HBAR)
        self.set_potential(self.V, self._vector_potential)

    def set_potential(self, potential: np.ndarray, 
                      vector_potential: List[np.ndarray] = None) -> None:
        if self.V is not potential:
            self.V = potential
        if self._vector_potential is not vector_potential:
            self._vector_potential = vector_potential
        V = potential
        dt = np.complex128(self._dt)
        m = np.complex128(self._m)
        if vector_potential:
            exp_vec = get_exp_vector_potential(dt, self._vector_potential, m, 
                                               hbar=self.HBAR)
            exp_A_V = [[0.0, 0.0, 0.0, 0.0] for i in range(4)]
            for i in range(4):
                for j in range(4):
                    exp_A_V[i][j] = exp_vec[i][j]*np.exp(-0.25*1.0j*V*dt)
            self._exp_V = exp_A_V
        else:
            exp_V = [[1.0*np.exp(-0.25*1.0j*V*dt/self.HBAR), 0, 0, 0], 
                     [0, 1.0*np.exp(-0.25*1.0j*V*dt/self.HBAR), 0, 0], 
                     [0, 0, 1.0*np.exp(-0.25*1.0j*V*dt/self.HBAR), 0], 
                     [0, 0, 0, 1.0*np.exp(-0.25*1.0j*V*dt/self.HBAR)]]
            self._exp_V = exp_V

    def __call__(self, psi: List[np.ndarray]) -> List[np.ndarray]:
        psi = list_mat_mul_4(self._exp_V, psi)
        psi_p = [np.fft.fftn(psi[i]) for i in range(4)]
        psi_p = list_mat_mul_4(self._exp_p, psi_p)
        psi = [np.fft.ifftn(psi_p[i]) for i in range(4)]
        psi = list_mat_mul_4(self._exp_V, psi)
        if self._norm:
            pass
        return psi


def list_mat_mul_4(A, x):
    b = [0, 0, 0, 0]
    for i in range(4):
        for j in range(4):
            b[i] += np.complex128(A[i][j])*x[j]
    return b